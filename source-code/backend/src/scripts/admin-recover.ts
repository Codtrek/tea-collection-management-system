/**
 * Break-glass recovery (Users-Roles-Addendum §10) — for when no Administrator can sign in.
 *
 *   BREAK_GLASS=1 npm run admin:recover -- --phone 07XXXXXXXX [--promote]
 *
 * Run on the server, in an interactive shell, against the database the backend uses
 * (`DATABASE_URL`). Unlike the seeds it deliberately has NO local-database guard: recovering
 * the hosted database is its whole purpose. It refuses unless BREAK_GLASS=1 is set, the shell
 * is a terminal, and the operator re-types the phone number.
 *
 * In one transaction it reactivates and unlocks the portal user, sets a new temporary password
 * (change forced at next sign-in), bumps `token_version` (every old session ends), optionally
 * promotes them to Administrator (only when no active Administrator exists) and writes the audit
 * row as "System (break-glass)". If any step — the audit row included — fails, nothing changes.
 * The temporary password is printed once, after the commit, and stored nowhere else.
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import { createInterface } from 'readline/promises';
import { formatUserId } from '../admin/admin-map';
import { generateTemporaryPassword } from '../admin/system-users.service';
import { formatAuditId } from '../audit/audit-map';
import { FACTORY_DB_ROLES } from '../auth/role-map';

const BCRYPT_COST = 10;
export const BREAK_GLASS_ACTOR = 'System (break-glass)';

export interface Queryable {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

/** A refusal the operator should read; the CLI prints it and exits 1. */
export class BreakGlassRefusal extends Error {}

export interface TargetRow extends Record<string, unknown> {
  id: number;
  name: string;
  phone: string;
  role: string;
  status: string;
  failed_login_count: number;
  locked_until: Date | null;
  token_version: number;
}

const TARGET_SQL = `SELECT id, name, phone, role, status, failed_login_count, locked_until, token_version
  FROM users WHERE phone = $1`;

const isLocked = (t: TargetRow, now: Date) =>
  t.locked_until !== null && new Date(t.locked_until).getTime() > now.getTime();

/** Looks the user up (no lock) so the operator can see who they are about to recover. */
export async function findTarget(
  db: Queryable,
  phone: string,
): Promise<TargetRow> {
  const { rows } = await db.query<TargetRow>(TARGET_SQL, [phone]);
  return assertPortalUser(db, rows[0], phone);
}

async function assertPortalUser(
  db: Queryable,
  t: TargetRow | undefined,
  phone: string,
): Promise<TargetRow> {
  if (!t) throw new BreakGlassRefusal(`No user has the phone number ${phone}.`);
  if (!(FACTORY_DB_ROLES as string[]).includes(t.role)) {
    throw new BreakGlassRefusal(
      `${t.name} (${t.role}) is not a factory-portal user. Break-glass recovers portal users only.`,
    );
  }
  // Portal sign-in refuses a login with no factory_employees profile, so recovering one would
  // hand out a password that can't be used.
  const { rows } = await db.query(
    'SELECT 1 AS ok FROM factory_employees WHERE user_id = $1',
    [t.id],
  );
  if (rows.length === 0) {
    throw new BreakGlassRefusal(
      `${t.name} has no factory staff profile, so they couldn't sign in to the portal even after recovery. Recover a different user.`,
    );
  }
  return t;
}

export function describeTarget(t: TargetRow, now: Date): string {
  return [
    `  User:   ${t.name} (${formatUserId(t.id)}), phone ${t.phone}`,
    `  Role:   ${t.role}`,
    `  Status: ${t.status}${isLocked(t, now) ? ', locked' : ''}`,
  ].join('\n');
}

export interface RecoverOptions {
  phone: string;
  promote: boolean;
  /** bcrypt hash of the new temporary password; the plain text never reaches this function. */
  passwordHash: string;
  now: Date;
}

export interface RecoverResult {
  userId: number;
  name: string;
  promoted: boolean;
  auditId: string;
}

/** The whole change, in one transaction. Throws (after ROLLBACK) on any refusal or failure. */
export async function recoverAdmin(
  db: Queryable,
  opts: RecoverOptions,
): Promise<RecoverResult> {
  await db.query('BEGIN');
  try {
    const { rows } = await db.query<TargetRow>(`${TARGET_SQL} FOR UPDATE`, [
      opts.phone,
    ]);
    const t = await assertPortalUser(db, rows[0], opts.phone);

    if (opts.promote) {
      // Same rule as countActiveAdmins (system-users.service.ts): any non-suspended factory_admin.
      const { rows: admins } = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM users WHERE role = 'factory_admin' AND status <> 'suspended'`,
      );
      const n = Number(admins[0]?.n ?? 0);
      if (n > 0) {
        throw new BreakGlassRefusal(
          `--promote refused: ${n} active Administrator${n === 1 ? '' : 's'} already exist${n === 1 ? 's' : ''}. Ask them to manage users in the portal, or recover an Administrator without --promote.`,
        );
      }
    }
    const newRole = opts.promote ? 'factory_admin' : t.role;

    await db.query(
      `UPDATE users SET status = 'active', failed_login_count = 0, locked_until = NULL,
         password_hash = $2, must_change_password = true, token_version = token_version + 1,
         role = $3
       WHERE id = $1`,
      [t.id, opts.passwordHash, newRole],
    );

    const auditId = await insertAudit(db, {
      record: formatUserId(t.id),
      details: `Break-glass recovery of ${t.name}: reactivated, unlocked, temporary password issued (change required at next sign-in), signed out everywhere${opts.promote ? ', promoted to Administrator' : ''}`,
      before: {
        status: t.status,
        locked: isLocked(t, opts.now),
        role: t.role,
      },
      after: { status: 'active', locked: false, role: newRole },
    });

    await db.query('COMMIT');
    return { userId: t.id, name: t.name, promoted: opts.promote, auditId };
  } catch (err) {
    await db.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

/**
 * Inside the transaction, so a failed audit row rolls the recovery back (AuditService.record
 * is best-effort and can't be used here). Ids follow AuditService: count()+1, retrying on a
 * primary-key clash — each try under a savepoint, since an error would abort the transaction.
 */
async function insertAudit(
  db: Queryable,
  row: {
    record: string;
    details: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  },
): Promise<string> {
  const { rows } = await db.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM audit_logs',
  );
  let seq = Number(rows[0]?.n ?? 0) + 1;
  for (let attempt = 0; ; attempt++) {
    const id = formatAuditId(seq);
    await db.query('SAVEPOINT audit_row');
    try {
      await db.query(
        `INSERT INTO audit_logs (id, user_id, user_name, role, action, module, record, record_href, details, before, after, reason)
         VALUES ($1, NULL, $2, 'System', 'Break-glass recovery', 'Administration', $3, '/admin/users', $4, $5, $6, $7)`,
        [
          id,
          BREAK_GLASS_ACTOR,
          row.record,
          row.details,
          JSON.stringify(row.before),
          JSON.stringify(row.after),
          'Server-side break-glass recovery (npm run admin:recover)',
        ],
      );
      await db.query('RELEASE SAVEPOINT audit_row');
      return id;
    } catch (err) {
      await db.query('ROLLBACK TO SAVEPOINT audit_row');
      const code = (err as { code?: string }).code;
      if (code !== '23505' || attempt >= 4) throw err;
      seq += 1 + attempt;
    }
  }
}

// ── CLI ─────────────────────────────────────────────────────────────

export interface CliArgs {
  phone: string;
  promote: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  let phone: string | undefined;
  let promote = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--promote') promote = true;
    else if (a === '--phone') phone = argv[++i];
    else if (a.startsWith('--phone=')) phone = a.slice('--phone='.length);
    else throw new BreakGlassRefusal(`Unknown argument: ${a}`);
  }
  phone = phone?.trim();
  if (!phone) {
    throw new BreakGlassRefusal(
      'Usage: BREAK_GLASS=1 npm run admin:recover -- --phone 07XXXXXXXX [--promote]',
    );
  }
  return { phone, promote };
}

export interface CliDeps {
  argv: string[];
  env: NodeJS.ProcessEnv;
  isTTY: boolean;
  /** Opens the database; `end` closes it. */
  connect: () => Promise<Queryable & { end: () => Promise<void> }>;
  ask: (question: string) => Promise<string>;
  out: (line: string) => void;
  err: (line: string) => void;
  generatePassword?: () => string;
  hash?: (plain: string) => Promise<string>;
  now?: () => Date;
}

/** Returns the process exit code. Every refusal happens before anything is written. */
export async function runCli(deps: CliDeps): Promise<number> {
  const now = deps.now ?? (() => new Date());
  let db: (Queryable & { end: () => Promise<void> }) | undefined;
  try {
    if (deps.env.BREAK_GLASS !== '1') {
      throw new BreakGlassRefusal(
        'Refusing to run: set BREAK_GLASS=1 to confirm this is a break-glass recovery.',
      );
    }
    if (!deps.isTTY) {
      throw new BreakGlassRefusal(
        'Refusing to run: this needs an interactive terminal (use `docker exec -it`, not a pipe or a script).',
      );
    }
    const args = parseArgs(deps.argv);

    db = await deps.connect();
    const target = await findTarget(db, args.phone);
    deps.out('Break-glass recovery will:');
    deps.out(describeTarget(target, now()));
    deps.out(
      `  → reactivate and unlock, issue a temporary password, sign out everywhere${args.promote ? ', and PROMOTE to Administrator' : ''}.`,
    );
    const typed = (
      await deps.ask('Re-type the phone number to confirm: ')
    ).trim();
    if (typed !== args.phone) {
      throw new BreakGlassRefusal(
        'The phone numbers do not match. Nothing was changed.',
      );
    }

    const password = (deps.generatePassword ?? generateTemporaryPassword)();
    const passwordHash = await (
      deps.hash ?? ((p) => bcrypt.hash(p, BCRYPT_COST))
    )(password);
    const result = await recoverAdmin(db, {
      phone: args.phone,
      promote: args.promote,
      passwordHash,
      now: now(),
    });

    deps.out('');
    deps.out(
      `Done. ${result.name} can sign in to the portal now${result.promoted ? ' as an Administrator' : ''}. Audit ${result.auditId}.`,
    );
    deps.out(`Temporary password (shown once): ${password}`);
    deps.out(
      'Give it to them in person or by phone — never in chat, email or a ticket. They must change it at sign-in.',
    );
    return 0;
  } catch (e) {
    if (e instanceof BreakGlassRefusal) {
      deps.err(e.message);
      return 1;
    }
    deps.err(`Break-glass recovery failed; nothing was changed. ${String(e)}`);
    return 2;
  } finally {
    await db?.end().catch(() => undefined);
  }
}

/**
 * Opens the terminal only when asking, so a line typed before the prompt appears isn't
 * swallowed. Ctrl+D / Ctrl+C at the prompt cancels (a refusal, nothing changed).
 */
async function askOnce(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } catch {
    throw new BreakGlassRefusal('Cancelled. Nothing was changed.');
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  void runCli({
    argv: process.argv.slice(2),
    env: process.env,
    isTTY: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    connect: async () => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new BreakGlassRefusal('DATABASE_URL is not set.');
      const client = new Client({
        connectionString: url,
        ssl: url.includes('neon.tech') ? true : undefined,
      });
      await client.connect();
      return client;
    },
    ask: askOnce,
    out: (l) => console.log(l),
    err: (l) => console.error(l),
  }).then((code) => process.exit(code));
}
