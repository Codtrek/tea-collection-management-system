/**
 * Demo data for testing Performance (and Attendance, Dispatch history, Collections, Fertilizer)
 * — LOCAL DATABASE ONLY.
 *
 *   npm run seed:demo         create (idempotent: already seeded → only re-prints the report)
 *   npm run seed:demo:reset   delete exactly the demo rows
 *
 * Every row it inserts is recorded in `demo_seed_rows` (created here, outside migrations), so
 * reset deletes exactly those rows — newest first, which respects the foreign keys — and
 * nothing else. It refuses any database that isn't on this machine.
 *
 * No services are called (they send notifications, cover offers, outbox rows and audit
 * entries). Rows go in with plain SQL in ONE transaction, after demo-plan.ts has checked them
 * against the business rules. No payroll, settlements, stock movements, notifications or
 * audit rows are created.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { Client } from 'pg';
import {
  addDays,
  type Assignment,
  buildPlan,
  DEMO_ACTOR,
  type DemoContext,
  mulberry32,
} from './demo-plan';
import { loadFacts, loadRows } from './demo-db';
import { expectedFor, renderReport } from './demo-expected';

const START = '2026-05-01';
const ATTENDANCE_START = '2026-08-01';
const END = '2026-11-05';
const REPORT = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'docs',
  'demo-seed-expected.md',
);

const ESTATE_NAMES = [
  'Ambewela',
  'Bogawantalawa',
  'Craig',
  'Dunsinane',
  'Edinburgh',
  'Fairyland',
  'Glenloch',
  'Hapugastalawa',
  'Ingestre',
  'Jetwing',
  'Kenmare',
  'Labookellie',
  'Mahagastota',
  'Nanu Oya',
  'Oliphant',
  'Pedro',
  'Queensberry',
  'Radella',
  'Somerset',
  'Tillyrie',
  'Uda Radella',
  'Venture',
  'Wattegodde',
  'Yoxford',
  'Agarapatana',
  'Bearwell',
  'Concordia',
  'Delmar',
  'Elbedde',
  'Frotoft',
  'Galaha',
  'Hatale',
  'Imboolpitiya',
  'Kotiyagala',
  'Loinorn',
  'Melfort',
];

// ── safety ────────────────────────────────────────────────────────────────

/** Refuse anything that isn't a database on this machine. */
function assertLocal(url: string | undefined): void {
  if (!url) throw new Error('DATABASE_URL is not set.');
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, '');
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(host) || /neon/i.test(url)) {
    throw new Error(
      `Refusing to run: the database host "${host}" is not local. The demo seed only runs on a local dev database.`,
    );
  }
}

// ── registry ──────────────────────────────────────────────────────────────

async function ensureRegistry(db: Client): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS demo_seed_rows (
    id         SERIAL PRIMARY KEY,
    table_name VARCHAR(60) NOT NULL,
    row_key    JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

async function registryCount(db: Client): Promise<number> {
  const exists = await db.query<{ t: string | null }>(
    `SELECT to_regclass('public.demo_seed_rows') AS t`,
  );
  if (!exists.rows[0].t) return 0;
  return Number(
    (await db.query<{ count: string }>('SELECT count(*) FROM demo_seed_rows'))
      .rows[0].count,
  );
}

/** INSERT one row and record its primary key in the registry. */
async function insert(
  db: Client,
  table: string,
  row: Record<string, unknown>,
  key: string[] = ['id'],
): Promise<Record<string, unknown>> {
  const cols = Object.keys(row);
  const res = await db.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING ${key.join(', ')}`,
    cols.map((c) => {
      const v = row[c];
      return v !== null && typeof v === 'object' && !(v instanceof Date)
        ? JSON.stringify(v)
        : v;
    }),
  );
  const k = res.rows[0] as Record<string, unknown>;
  const rowKey = Object.fromEntries(
    key.map((c) => [c, k[c] instanceof Date ? isoDate(k[c]) : k[c]]),
  );
  await db.query(
    'INSERT INTO demo_seed_rows (table_name, row_key) VALUES ($1, $2)',
    [table, JSON.stringify(rowKey)],
  );
  return k;
}

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const at = (date: string, time: string) => `${date}T${time}:00+05:30`;

// ── seed ──────────────────────────────────────────────────────────────────

async function seed(db: Client): Promise<void> {
  await ensureRegistry(db);
  if ((await registryCount(db)) > 0) {
    console.log(
      'Demo data is already seeded — nothing inserted. (npm run seed:demo:reset removes it.)\n',
    );
    return;
  }
  const rng = mulberry32(7);
  const one = async <T>(sql: string, args: unknown[] = []) =>
    (await db.query(sql, args)).rows[0] as T;
  const all = async <T>(sql: string, args: unknown[] = []) =>
    (await db.query(sql, args)).rows as T[];

  // who is who
  const agents = await all<{ id: number; employeeId: number; name: string }>(
    `SELECT ca.id, e.id AS "employeeId", e.name FROM collection_agents ca JOIN employees e ON e.id = ca.hr_employee_id WHERE e.status = 'Active' ORDER BY ca.id`,
  );
  const byName = (n: string) => {
    const a = agents.find((x) => x.name === n);
    if (!a)
      throw new Error(
        `Agent ${n} not found — the demo stories need the five existing agents.`,
      );
    return a.id;
  };
  const staff = await all<{
    id: number;
    name: string;
    role: string;
    category: 'factory' | 'office';
  }>(
    `SELECT e.id, e.name, e.role, e.category FROM employees e WHERE e.status = 'Active' AND NOT EXISTS (SELECT 1 FROM collection_agents ca WHERE ca.hr_employee_id = e.id) ORDER BY e.id`,
  );
  const staffBy = (
    pred: (s: (typeof staff)[number]) => boolean,
    what: string,
  ) => {
    const s = staff.find(pred);
    if (!s) throw new Error(`No ${what} among the staff.`);
    return s.id;
  };
  const owners = await all<{ id: number; name: string }>(
    'SELECT id, name FROM tea_estate_owners ORDER BY id',
  );
  const factory = await one<{ id: number }>(
    'SELECT id FROM factories ORDER BY id LIMIT 1',
  );

  // the holiday calendar must already cover the period — never invented here
  const facts = await loadFacts(db);
  for (const m of [
    '2026-05',
    '2026-06',
    '2026-07',
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
  ]) {
    if (
      !facts.holidays.some(
        (h) =>
          h.date.startsWith(m) && (h.type === 'poya' || h.type === 'public'),
      )
    ) {
      throw new Error(
        `No Poya or public holiday found for ${m}. Run the Sri Lanka holiday import first — the seed doesn't invent holiday dates.`,
      );
    }
  }

  // 1. two demo routes (Route 6: Tue/Fri, Route 7: Wed/Sat) and their permanent agents
  const route6 = await insert(db, 'routes', {
    factory_id: factory.id,
    name: 'Route 6 (demo)',
  });
  const route7 = await insert(db, 'routes', {
    factory_id: factory.id,
    name: 'Route 7 (demo)',
  });
  for (const [r, days] of [
    [route6.id, [2, 5]],
    [route7.id, [3, 6]],
  ] as [number, number[]][]) {
    for (const wd of days)
      await insert(
        db,
        'route_schedule_weekdays',
        { route_id: r, weekday: wd },
        ['route_id', 'weekday'],
      );
  }
  const PER = byName('N. Perera');
  const SIL = byName('D. Silva');
  const perm = (
    route: number,
    agent: number,
    from: string,
    to: string | null,
  ) =>
    insert(db, 'route_assignments', {
      route_id: route,
      agent_id: agent,
      type: 'PERMANENT',
      status: 'ACTIVE',
      valid_from: from,
      valid_to: to,
      created_by: DEMO_ACTOR,
      accepted_at: at(from, '06:00'),
      reason: 'Demo seed',
    });
  await perm(route6.id as number, PER, START, null);
  await perm(route7.id as number, PER, START, '2026-10-19');
  await perm(route7.id as number, SIL, '2026-10-20', null);

  // 2. about 6 demo estates on every route, owned by the existing owners
  const routes = await all<{ id: number; name: string }>(
    'SELECT id, name FROM routes ORDER BY id',
  );
  const estates: DemoContext['estates'] = [];
  let n = 0;
  for (const r of routes) {
    for (let i = 0; i < 6; i++) {
      const owner = owners[n % owners.length];
      const name = `${ESTATE_NAMES[n]} Estate (demo)`;
      const row = await insert(db, 'estates', {
        owner_id: owner.id,
        name,
        location: 'Nuwara Eliya',
        route_id: r.id,
        route_name: r.name,
        status: 'active',
        registered_on: '2026-04-15',
        last_updated_by: DEMO_ACTOR,
        payment_method: 'bank',
        lat: 6.95 + rng() * 0.1,
        lng: 80.75 + rng() * 0.1,
      });
      estates.push({
        id: row.id as number,
        name,
        routeId: r.id,
        ownerName: owner.name,
      });
      n += 1;
    }
  }

  // 3. the plan, checked against the rules
  const schedules = new Map<
    number,
    {
      weekdays: number[];
      overrides: { date: string; kind: 'ADD' | 'CANCEL' }[];
    }
  >();
  for (const r of routes) schedules.set(r.id, { weekdays: [], overrides: [] });
  for (const w of await all<{ route_id: number; weekday: number }>(
    'SELECT route_id, weekday FROM route_schedule_weekdays',
  ))
    schedules.get(w.route_id)?.weekdays.push(Number(w.weekday));
  for (const o of await all<{
    route_id: number;
    date: string;
    kind: 'ADD' | 'CANCEL';
  }>(
    `SELECT route_id, to_char(date,'YYYY-MM-DD') date, kind FROM route_schedule_overrides`,
  ))
    schedules.get(o.route_id)?.overrides.push({ date: o.date, kind: o.kind });
  const assignments = await all<Assignment>(
    `SELECT id, route_id AS "routeId", agent_id AS "agentId", type, status, to_char(valid_from,'YYYY-MM-DD') AS "validFrom", to_char(valid_to,'YYYY-MM-DD') AS "validTo" FROM route_assignments WHERE type = 'PERMANENT'`,
  );
  const existing = await all<{ k: string }>(
    `SELECT employee_id || ':' || to_char(date,'YYYY-MM-DD') AS k FROM employee_attendance`,
  );
  const ctx: DemoContext = {
    start: START,
    attendanceStart: ATTENDANCE_START,
    end: END,
    facts,
    routes: routes.map((r) => ({
      id: r.id,
      name: r.name,
      schedule: schedules.get(r.id)!,
    })),
    assignments,
    estates,
    agents,
    staff,
    existingAttendance: new Set(existing.map((x) => x.k)),
    agentId: {
      SEN: byName('R. Senanayake'),
      GUN: byName('W. Gunaratne'),
      WEE: byName('K. Weerasinghe'),
      PER,
      SIL,
    },
    staffId: {
      DRIVER: staffBy((s) => s.role === 'Driver', 'Driver'),
      KPERERA: staffBy((s) => s.name === 'K. Perera', 'K. Perera'),
      NSILVA: staffBy((s) => s.name === 'N. Silva', 'N. Silva'),
      SFERNANDO: staffBy((s) => s.name === 'S. Fernando', 'S. Fernando'),
    },
  };
  const plan = buildPlan(ctx);

  // 4. covers (2 accepted, 1 declined)
  for (const c of plan.covers) {
    await insert(db, 'route_assignments', {
      route_id: c.routeId,
      agent_id: c.agentId,
      type: 'COVER',
      status: c.status,
      valid_from: c.date,
      valid_to: c.date,
      created_by: DEMO_ACTOR,
      covers_assignment_id: c.coversAssignmentId,
      reason: 'Demo seed: covering an absence',
      accepted_at: c.status === 'ACTIVE' ? at(c.date, '05:40') : null,
      responded_at: at(c.date, '05:40'),
      expires_at: at(c.date, '05:50'),
      created_at: at(c.date, '05:35'),
    });
  }

  // 5. collections and their grade lines
  for (const c of plan.collections) {
    const timeline = [
      {
        by: 'Estate owner',
        status: 'Submitted',
        timestamp: `${addDays(c.date, -1)}T18:00:00`,
      },
      {
        by: DEMO_ACTOR,
        status: 'Approved',
        timestamp: `${addDays(c.date, -1)}T19:00:00`,
      },
      {
        by: 'System',
        status: 'Agent Assigned',
        timestamp: `${addDays(c.date, -1)}T19:00:00`,
      },
      ...(c.visited
        ? [
            {
              by: c.agentName,
              status: 'Collected',
              timestamp: `${c.date}T09:30:00`,
            },
            {
              by: DEMO_ACTOR,
              status: 'Confirmed',
              timestamp: `${c.date}T12:00:00`,
            },
          ]
        : []),
    ];
    await insert(db, 'tea_collection_records', {
      id: c.id,
      estate_id: c.estateId,
      estate_name: c.estateName,
      route_id: c.routeId,
      route_name: c.routeName,
      weight_kg: c.estateKg,
      status: c.visited ? 'confirmed' : 'agent_assigned',
      collection_date: c.date,
      agent_id: c.agentId,
      agent_name: c.agentName,
      timeline,
      last_updated_by: DEMO_ACTOR,
      last_updated_on: at(c.date, c.visited ? '12:00' : '07:00'),
      created_at: at(addDays(c.date, -1), '18:00'),
      graded_at: c.visited ? at(c.date, '12:00') : null,
      locked_at: c.visited ? at(c.date, '12:30') : null,
    });
    if (c.visited) {
      for (const [grade, kg] of [
        ['super', c.superKg],
        ['normal', c.normalKg],
      ] as const) {
        if (kg && kg > 0) {
          await insert(db, 'delivery_grade_lines', {
            delivery_id: c.id,
            grade,
            weight_kg: kg,
            graded_by: DEMO_ACTOR,
            graded_at: `${c.date} 12:00:00`,
          });
        }
      }
    }
  }

  // 6. attendance, and the dispatch board's view of agent absences (one record, two views)
  for (const a of plan.attendance) {
    await insert(db, 'employee_attendance', {
      employee_id: a.employeeId,
      date: a.date,
      status: a.status,
      day_hours: a.dayHours,
      half: a.half,
      short_out: a.shortOut,
      short_back: a.shortBack,
      holiday_worked: a.holidayWorked,
      marked_by: DEMO_ACTOR,
      marked_at: at(a.date, '07:30'),
      source: 'portal',
      created_at: at(a.date, '07:30'),
    });
  }
  for (const x of plan.agentAbsences) {
    await insert(
      db,
      'agent_day_status',
      {
        agent_id: x.agentId,
        day: x.date,
        status: 'ABSENT',
        source: 'officer',
        reason: x.reason,
        marked_by: DEMO_ACTOR,
      },
      ['agent_id', 'day'],
    );
  }

  // 7. fertilizer requests (final: Delivered — no committed stock) and their attempts
  for (const f of plan.fertilizer) {
    const owner = await one<{ owner_id: number }>(
      'SELECT owner_id FROM estates WHERE id = $1',
      [f.estateId],
    );
    const failures = f.attempts.filter((x) => x.outcome === 'failed').length;
    const req = await insert(db, 'fertilizer_requests', {
      estate_id: f.estateId,
      owner_id: owner.owner_id,
      quantity_kg: f.qtyKg,
      justification: 'Demo seed',
      owner_status: 'approved',
      factory_id: factory.id,
      factory_status: 'approved',
      origin: 'web',
      status: 'Delivered',
      approved_qty_kg: f.qtyKg,
      dispatched_qty_kg: f.qtyKg,
      delivered_qty_kg: f.qtyKg,
      decided_by: DEMO_ACTOR,
      decided_on: at(f.requestedOn, '10:00'),
      created_at: at(f.requestedOn, '09:00'),
      updated_at: at(f.attempts.at(-1)!.date, '11:00'),
      route_id: f.routeId,
      payment_method: 'cash',
      cycle_failures: failures,
    });
    for (const [i, x] of f.attempts.entries()) {
      const ok = x.outcome === 'delivered';
      await insert(db, 'fertilizer_deliveries', {
        request_id: req.id,
        attempt_no: i + 1,
        estate_id: f.estateId,
        route_id: f.routeId,
        scheduled_date: x.date,
        pickup_agent_id: f.agentId,
        handover_qty_kg: f.qtyKg,
        handover_by: DEMO_ACTOR,
        handover_at: at(x.date, '06:00'),
        agent_confirm_qty_kg: f.qtyKg,
        agent_confirmed_at: at(x.date, '06:05'),
        out_for_delivery_at: at(x.date, '07:00'),
        outcome: x.outcome,
        delivered_qty_kg: ok ? f.qtyKg : null,
        owner_name: ok ? f.ownerName : null,
        owner_confirmed_at: ok ? at(x.date, '10:00') : null,
        fail_reason: x.failReason,
        fail_note: ok ? null : 'Demo seed',
        recorded_at: at(x.date, '10:00'),
        checked_in_qty_kg: ok ? null : f.qtyKg,
        checked_in_by: ok ? null : DEMO_ACTOR,
        checked_in_at: ok ? null : at(x.date, '16:00'),
      });
    }
  }

  const count = await registryCount(db);
  console.log(
    `Seeded ${count} rows: ${plan.collections.length} collections (${plan.collections.filter((c) => !c.visited).length} missed), ` +
      `${plan.attendance.length} attendance marks, ${plan.covers.length} cover requests, ${plan.fertilizer.length} fertilizer requests, ${estates.length} estates, 2 routes.\n`,
  );
}

// ── reset ─────────────────────────────────────────────────────────────────

/** Rows NOT in the registry that point (by foreign key) at rows that are. */
async function foreignReferences(db: Client): Promise<string[]> {
  const fks = (
    await db.query(`
      SELECT c.conrelid::regclass::text AS child, a.attname AS child_col, c.confrelid::regclass::text AS parent, af.attname AS parent_col
      FROM pg_constraint c
      JOIN pg_attribute a  ON a.attrelid = c.conrelid  AND a.attnum = c.conkey[1]
      JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = c.confkey[1]
      WHERE c.contype = 'f' AND array_length(c.conkey, 1) = 1
        AND c.confrelid::regclass::text IN (SELECT DISTINCT table_name FROM demo_seed_rows)`)
  ).rows as {
    child: string;
    child_col: string;
    parent: string;
    parent_col: string;
  }[];
  const out: string[] = [];
  for (const fk of fks) {
    const pk = (
      await db.query<{ attname: string; type: string }>(
        `SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS type FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = $1::regclass AND i.indisprimary`,
        [fk.child],
      )
    ).rows;
    // the same shape the registry stores: dates as 'YYYY-MM-DD', the rest as-is
    const keyExpr = pk.length
      ? `jsonb_build_object(${pk.map((c) => `'${c.attname}', ${c.type === 'date' ? `to_char(x.${c.attname}, 'YYYY-MM-DD')` : `x.${c.attname}`}`).join(', ')})`
      : `'{}'::jsonb`;
    const res = await db.query<{ count: string }>(
      `SELECT count(*) FROM ${fk.child} x
       WHERE x.${fk.child_col}::text IN (SELECT r.row_key->>'${fk.parent_col}' FROM demo_seed_rows r WHERE r.table_name = '${fk.parent}')
         AND NOT EXISTS (SELECT 1 FROM demo_seed_rows r WHERE r.table_name = '${fk.child}' AND r.row_key = ${keyExpr})`,
    );
    const c = Number(res.rows[0].count);
    if (c > 0)
      out.push(
        `${c} row(s) in ${fk.child}.${fk.child_col} → demo ${fk.parent}`,
      );
  }
  return out;
}

/** Text that mentions demo data without a foreign key (audit log, notifications). */
async function softReferences(db: Client): Promise<string[]> {
  const out: string[] = [];
  const checks: [string, string][] = [
    [
      'audit_logs',
      `record ILIKE '%(demo)%' OR record LIKE '%DEMO-%' OR details ILIKE '%(demo)%' OR details LIKE '%DEMO-%' OR user_name = '${DEMO_ACTOR}'`,
    ],
    [
      'notifications',
      `title ILIKE '%(demo)%' OR body ILIKE '%(demo)%' OR body LIKE '%DEMO-%'`,
    ],
  ];
  for (const [t, where] of checks) {
    const c = Number(
      (
        await db.query<{ count: string }>(
          `SELECT count(*) FROM ${t} WHERE ${where}`,
        )
      ).rows[0].count,
    );
    if (c > 0) out.push(`${c} row(s) in ${t} mention demo data`);
  }
  return out;
}

async function reset(db: Client): Promise<void> {
  if ((await registryCount(db)) === 0) {
    console.log('No demo data to remove.');
    return;
  }
  const refs = await foreignReferences(db);
  if (refs.length > 0) {
    throw new Error(
      `Not resetting — rows created outside the seed point at demo data:\n  ${refs.join('\n  ')}\nRemove or re-point them first (they were made by using the app on demo data).`,
    );
  }
  const rows = (
    await db.query(
      'SELECT table_name, row_key FROM demo_seed_rows ORDER BY id DESC',
    )
  ).rows as { table_name: string; row_key: Record<string, unknown> }[];
  let deleted = 0;
  for (const r of rows) {
    const cols = Object.keys(r.row_key);
    const res = await db.query(
      `DELETE FROM ${r.table_name} WHERE ${cols.map((c, i) => `${c} = $${i + 1}`).join(' AND ')}`,
      cols.map((c) => r.row_key[c]),
    );
    deleted += res.rowCount ?? 0;
  }
  await db.query('DROP TABLE demo_seed_rows');
  console.log(`Removed ${deleted} demo rows (of ${rows.length} recorded).`);
  const soft = await softReferences(db);
  console.log(
    soft.length
      ? `Still mentioning demo data:\n  ${soft.join('\n  ')}`
      : 'Nothing else references demo data.',
  );
}

// ── report ────────────────────────────────────────────────────────────────

async function report(db: Client): Promise<void> {
  const rows = await loadRows(db, END);
  const text = renderReport(
    [
      {
        title: 'October 2026',
        people: expectedFor(rows, '2026-10-01', '2026-10-31'),
      },
      {
        title: 'Last 3 months (August – October 2026)',
        people: expectedFor(rows, '2026-08-01', '2026-10-31'),
      },
    ],
    rows.tolerancePct,
  );
  console.log(text);
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, text + '\n');
  console.log(`\nSaved to ${REPORT}`);
}

async function main(): Promise<void> {
  assertLocal(process.env.DATABASE_URL);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('BEGIN');
    if (process.argv.includes('--reset')) await reset(db);
    else await seed(db);
    await db.query('COMMIT');
    if (!process.argv.includes('--reset')) await report(db);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error((err as Error).message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

void main();
