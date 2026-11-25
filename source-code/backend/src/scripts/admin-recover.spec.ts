import {
  BREAK_GLASS_ACTOR,
  BreakGlassRefusal,
  type CliDeps,
  parseArgs,
  type Queryable,
  recoverAdmin,
  runCli,
  type TargetRow,
} from './admin-recover';

const NOW = new Date('2026-11-25T10:00:00Z');

/**
 * A small in-memory stand-in for the two tables the script touches. Transactions are modelled
 * with snapshots so ROLLBACK really undoes the UPDATE (the property the script relies on).
 */
class FakeDb implements Queryable {
  users: TargetRow[];
  audit: Record<string, unknown>[] = [];
  log: string[] = [];
  failAuditWith: { code?: string } | null = null;
  failAuditTimes = Infinity;
  /** user ids with a factory_employees profile (default: every user). */
  profiles: Set<number>;
  ended = false;
  private snapshot: {
    users: TargetRow[];
    audit: Record<string, unknown>[];
  } | null = null;
  private savepoint: Record<string, unknown>[] | null = null;

  constructor(users: Partial<TargetRow>[]) {
    this.users = users.map((u, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      phone: `07700000${i + 1}`,
      role: 'factory_admin',
      status: 'active',
      failed_login_count: 0,
      locked_until: null,
      token_version: 0,
      ...u,
    }));
    this.profiles = new Set(this.users.map((u) => u.id));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async query<R extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: R[] }> {
    const s = sql.replace(/\s+/g, ' ').trim();
    this.log.push(s.split(' ').slice(0, 3).join(' '));
    const rows = (r: unknown[]) => ({ rows: r as R[] });
    if (s === 'BEGIN') {
      this.snapshot = {
        users: this.users.map((u) => ({ ...u })),
        audit: [...this.audit],
      };
      return rows([]);
    }
    if (s === 'COMMIT') {
      this.snapshot = null;
      return rows([]);
    }
    if (s === 'ROLLBACK') {
      if (this.snapshot)
        ({ users: this.users, audit: this.audit } = this.snapshot);
      this.snapshot = null;
      return rows([]);
    }
    if (s.startsWith('SAVEPOINT')) {
      this.savepoint = [...this.audit];
      return rows([]);
    }
    if (s.startsWith('RELEASE')) return rows([]);
    if (s.startsWith('ROLLBACK TO')) {
      this.audit = this.savepoint ?? this.audit;
      return rows([]);
    }
    if (s.startsWith('SELECT id, name, phone')) {
      return rows(
        this.users.filter((u) => u.phone === params[0]).map((u) => ({ ...u })),
      );
    }
    if (s.startsWith('SELECT 1 AS ok FROM factory_employees')) {
      return rows(this.profiles.has(params[0] as number) ? [{ ok: 1 }] : []);
    }
    if (s.includes("FROM users WHERE role = 'factory_admin'")) {
      return rows([
        {
          n: this.users.filter(
            (u) => u.role === 'factory_admin' && u.status !== 'suspended',
          ).length,
        },
      ]);
    }
    if (s.includes('FROM audit_logs')) return rows([{ n: this.audit.length }]);
    if (s.startsWith('UPDATE users')) {
      const u = this.users.find((x) => x.id === params[0])!;
      Object.assign(u, {
        status: 'active',
        failed_login_count: 0,
        locked_until: null,
        password_hash: params[1],
        must_change_password: true,
        token_version: u.token_version + 1,
        role: params[2],
      });
      return rows([]);
    }
    if (s.startsWith('INSERT INTO audit_logs')) {
      if (this.failAuditWith && this.failAuditTimes-- > 0)
        throw Object.assign(
          new Error('audit insert failed'),
          this.failAuditWith,
        );
      const [id, userName, record, details, before, after, reason] =
        params as string[];
      this.audit.push({
        id,
        userName,
        record,
        details,
        before: JSON.parse(before),
        after: JSON.parse(after),
        reason,
        sql: s,
      });
      return rows([]);
    }
    throw new Error(`FakeDb: unexpected SQL ${s}`);
  }

  end() {
    this.ended = true;
    return Promise.resolve();
  }
}

const LOCKED = new Date('2026-11-25T10:10:00Z');

describe('recoverAdmin (one transaction)', () => {
  it('reactivates, unlocks, forces a password change, bumps token_version and audits', async () => {
    const db = new FakeDb([
      {
        phone: '0771111111',
        status: 'suspended',
        failed_login_count: 3,
        locked_until: LOCKED,
        token_version: 4,
      },
    ]);
    const r = await recoverAdmin(db, {
      phone: '0771111111',
      promote: false,
      passwordHash: 'HASH',
      now: NOW,
    });

    expect(db.users[0]).toMatchObject({
      status: 'active',
      failed_login_count: 0,
      locked_until: null,
      password_hash: 'HASH',
      must_change_password: true,
      token_version: 5,
      role: 'factory_admin',
    });
    expect(r).toEqual({
      userId: 1,
      name: 'User 1',
      promoted: false,
      auditId: 'AUD-00001',
    });
    expect(db.audit).toHaveLength(1);
    expect(db.audit[0]).toMatchObject({
      id: 'AUD-00001',
      userName: BREAK_GLASS_ACTOR,
      record: 'USR-0001',
      before: { status: 'suspended', locked: true, role: 'factory_admin' },
      after: { status: 'active', locked: false, role: 'factory_admin' },
    });
    expect(db.audit[0].sql).toContain(
      "'System', 'Break-glass recovery', 'Administration'",
    );
    expect(db.log[0]).toBe('BEGIN');
    expect(db.log.at(-1)).toBe('COMMIT');
  });

  it('--promote makes a Manager an Administrator when no active Administrator exists', async () => {
    const db = new FakeDb([
      { phone: '0771111111', role: 'factory_admin', status: 'suspended' },
      { phone: '0772222222', role: 'factory_manager' },
    ]);
    const r = await recoverAdmin(db, {
      phone: '0772222222',
      promote: true,
      passwordHash: 'H',
      now: NOW,
    });
    expect(r.promoted).toBe(true);
    expect(db.users[1].role).toBe('factory_admin');
    expect(db.audit[0]).toMatchObject({
      before: { role: 'factory_manager' },
      after: { role: 'factory_admin' },
    });
  });

  it('--promote is refused while an active Administrator exists, and nothing changes', async () => {
    const db = new FakeDb([
      { phone: '0771111111', role: 'factory_admin' },
      { phone: '0772222222', role: 'factory_officer', status: 'suspended' },
    ]);
    await expect(
      recoverAdmin(db, {
        phone: '0772222222',
        promote: true,
        passwordHash: 'H',
        now: NOW,
      }),
    ).rejects.toThrow(/1 active Administrator already exists/);
    expect(db.users[1]).toMatchObject({
      role: 'factory_officer',
      status: 'suspended',
      token_version: 0,
    });
    expect(db.audit).toHaveLength(0);
    expect(db.log.at(-1)).toBe('ROLLBACK');
  });

  it('refuses an unknown phone and a non-portal user', async () => {
    const db = new FakeDb([{ phone: '0773333333', role: 'collection_agent' }]);
    await expect(
      recoverAdmin(db, {
        phone: '0779999999',
        promote: false,
        passwordHash: 'H',
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(BreakGlassRefusal);
    await expect(
      recoverAdmin(db, {
        phone: '0773333333',
        promote: false,
        passwordHash: 'H',
        now: NOW,
      }),
    ).rejects.toThrow(/not a factory-portal user/);
    expect(db.users[0].token_version).toBe(0);
  });

  it('refuses a portal user with no factory staff profile (they could not sign in anyway)', async () => {
    const db = new FakeDb([{ phone: '0771111111', status: 'suspended' }]);
    db.profiles.clear();
    await expect(
      recoverAdmin(db, {
        phone: '0771111111',
        promote: false,
        passwordHash: 'H',
        now: NOW,
      }),
    ).rejects.toThrow(/no factory staff profile/);
    expect(db.users[0]).toMatchObject({
      status: 'suspended',
      token_version: 0,
    });
  });

  it('rolls the whole recovery back when the audit row cannot be written', async () => {
    const db = new FakeDb([{ phone: '0771111111', status: 'suspended' }]);
    db.failAuditWith = { code: '42P01' };
    await expect(
      recoverAdmin(db, {
        phone: '0771111111',
        promote: false,
        passwordHash: 'H',
        now: NOW,
      }),
    ).rejects.toThrow('audit insert failed');
    expect(db.users[0]).toMatchObject({
      status: 'suspended',
      token_version: 0,
    });
    expect(db.users[0]).not.toHaveProperty('password_hash');
  });

  it('retries the audit id on a primary-key clash (23505)', async () => {
    const db = new FakeDb([{ phone: '0771111111' }]);
    db.failAuditWith = { code: '23505' };
    db.failAuditTimes = 1;
    const r = await recoverAdmin(db, {
      phone: '0771111111',
      promote: false,
      passwordHash: 'H',
      now: NOW,
    });
    expect(r.auditId).toBe('AUD-00002');
    expect(db.users[0].token_version).toBe(1);
  });
});

describe('runCli', () => {
  const setup = (
    over: Partial<CliDeps> = {},
    users: Partial<TargetRow>[] = [
      { phone: '0771111111', status: 'suspended' },
    ],
  ) => {
    const db = new FakeDb(users);
    const out: string[] = [];
    const err: string[] = [];
    const deps: CliDeps = {
      argv: ['--phone', '0771111111'],
      env: { BREAK_GLASS: '1' },
      isTTY: true,
      connect: () => Promise.resolve(db),
      ask: () => Promise.resolve('0771111111'),
      out: (l) => out.push(l),
      err: (l) => err.push(l),
      generatePassword: () => 'Tmp-Pass-1234',
      hash: (p) => Promise.resolve(`hashed:${p}`),
      now: () => NOW,
      ...over,
    };
    return { db, out, err, run: () => runCli(deps) };
  };

  it('prints the temporary password once, after the change, and nowhere in the audit', async () => {
    const { db, out, err, run } = setup();
    expect(await run()).toBe(0);
    expect(err).toEqual([]);
    expect(out.filter((l) => l.includes('Tmp-Pass-1234'))).toHaveLength(1);
    expect(db.users[0]).toMatchObject({
      password_hash: 'hashed:Tmp-Pass-1234',
      status: 'active',
    });
    expect(JSON.stringify(db.audit)).not.toContain('Tmp-Pass-1234');
    expect(db.ended).toBe(true);
  });

  it.each([
    ['BREAK_GLASS is not set', { env: {} }, /set BREAK_GLASS=1/],
    ['not a terminal', { isTTY: false }, /interactive terminal/],
    ['no --phone', { argv: [] }, /Usage:/],
    [
      'the re-typed phone differs',
      { ask: () => Promise.resolve('0771111112') },
      /do not match/,
    ],
  ])(
    'refuses when %s, before changing anything',
    async (_name, over, message) => {
      const { db, err, out, run } = setup(over);
      expect(await run()).toBe(1);
      expect(err.join('\n')).toMatch(message);
      expect(db.users[0]).toMatchObject({
        status: 'suspended',
        token_version: 0,
      });
      expect(out.join('\n')).not.toContain('Tmp-Pass-1234');
    },
  );

  it('does not open the database without BREAK_GLASS=1', async () => {
    const connect = jest.fn();
    const { run } = setup({ env: {}, connect });
    await run();
    expect(connect).not.toHaveBeenCalled();
  });

  it('exits 2 and says nothing changed on an unexpected database error', async () => {
    const { err, run } = setup({
      connect: () => Promise.reject(new Error('ECONNREFUSED')),
    });
    expect(await run()).toBe(2);
    expect(err[0]).toMatch(/nothing was changed.*ECONNREFUSED/);
  });
});

describe('parseArgs', () => {
  it('accepts --phone X, --phone=X and --promote; rejects anything else', () => {
    expect(parseArgs(['--phone', ' 0771111111 ', '--promote'])).toEqual({
      phone: '0771111111',
      promote: true,
    });
    expect(parseArgs(['--phone=0771111111'])).toEqual({
      phone: '0771111111',
      promote: false,
    });
    expect(() => parseArgs(['--phone', '077', '--force'])).toThrow(
      /Unknown argument: --force/,
    );
  });
});
