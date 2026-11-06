/**
 * Reading the local database for the demo seed and its expected-figures report: the holiday
 * calendar exactly as working-days.ts reads it, and the rows the Performance measures use.
 */
import type { Client } from 'pg';
import { type CalendarFacts, DEFAULT_TYPES } from '../holidays/working-days';
import type { Rows } from './demo-expected';

/** The holiday calendar as working-days.ts reads it (same as HolidayService.facts). */
export async function loadFacts(db: Client): Promise<CalendarFacts> {
  // one client: one query at a time
  type Kind = 'poya' | 'public' | 'closure';
  const h = await db.query<{
    date: string;
    name: string;
    type: Kind;
    paid: boolean | null;
    work_allowed: boolean | null;
    applies_to: 'all' | 'factory' | 'office';
  }>(
    `SELECT to_char(date,'YYYY-MM-DD') date, name, type, paid, work_allowed, applies_to FROM holidays WHERE cancelled_at IS NULL`,
  );
  const t = await db.query<{
    type: Kind | 'weekly';
    label: string;
    paid: boolean;
    work_allowed: boolean;
  }>('SELECT type, label, paid, work_allowed FROM holiday_types');
  const w = await db.query<{
    id: number;
    category: 'factory' | 'office';
    weekdays: number[];
    half_day_weekday: number | null;
    ef: string;
  }>(
    `SELECT id, category, weekdays, half_day_weekday, to_char(effective_from,'YYYY-MM-DD') ef FROM weekly_holiday_rules`,
  );
  const r = await db.query<{
    id: number;
    employee_id: number;
    weekday: number | null;
    ef: string;
  }>(
    `SELECT id, employee_id, weekday, to_char(effective_from,'YYYY-MM-DD') ef FROM employee_rest_days`,
  );
  const types = { ...DEFAULT_TYPES };
  for (const x of t.rows)
    types[x.type] = {
      label: x.label,
      paid: x.paid,
      workAllowed: x.work_allowed,
    };
  return {
    holidays: h.rows.map((x) => ({
      date: x.date,
      name: x.name,
      type: x.type,
      paid: x.paid ?? types[x.type].paid,
      workAllowed: x.work_allowed ?? types[x.type].workAllowed,
      appliesTo: x.applies_to,
    })),
    weekly: w.rows.map((x) => ({
      id: x.id,
      category: x.category,
      weekdays: x.weekdays.map(Number),
      halfDayWeekday: x.half_day_weekday,
      effectiveFrom: x.ef,
    })),
    restDays: r.rows.map((x) => ({
      id: x.id,
      employeeId: x.employee_id,
      weekday: x.weekday,
      effectiveFrom: x.ef,
    })),
    types,
  };
}

export async function loadRows(db: Client, today: string): Promise<Rows> {
  const q = async <T>(sql: string) => (await db.query(sql)).rows as T[];
  // one client: one query at a time
  const employees = await q<Rows['employees'][number]>(
    `SELECT id, name, role, category, status FROM employees`,
  );
  const agents = await q<Rows['agents'][number]>(
    `SELECT id, hr_employee_id AS "employeeId" FROM collection_agents WHERE hr_employee_id IS NOT NULL`,
  );
  const attendance = await q<Rows['attendance'][number]>(
    `SELECT employee_id AS "employeeId", to_char(date,'YYYY-MM-DD') date, status FROM employee_attendance`,
  );
  const weekdays = await q<Rows['weekdays'][number]>(
    `SELECT route_id AS "routeId", weekday FROM route_schedule_weekdays`,
  );
  const overrides = await q<Rows['overrides'][number]>(
    `SELECT route_id AS "routeId", to_char(date,'YYYY-MM-DD') date, kind FROM route_schedule_overrides`,
  );
  const assignments = await q<Rows['assignments'][number]>(
    `SELECT id, route_id AS "routeId", agent_id AS "agentId", type, status, to_char(valid_from,'YYYY-MM-DD') AS "validFrom", to_char(valid_to,'YYYY-MM-DD') AS "validTo" FROM route_assignments`,
  );
  const collections = await q<{
    id: string;
    routeId: number | null;
    date: string;
    status: string;
    agentId: number | null;
    estateKg: string;
    factoryKg: string | null;
  }>(
    `SELECT r.id, r.route_id AS "routeId", to_char(r.collection_date,'YYYY-MM-DD') date, r.status, r.agent_id AS "agentId", r.weight_kg AS "estateKg",
              (SELECT sum(g.weight_kg) FROM delivery_grade_lines g WHERE g.delivery_id = r.id) AS "factoryKg"
       FROM tea_collection_records r`,
  );
  const deliveries = await q<{
    attemptNo: number;
    agentId: number | null;
    outcome: string | null;
    failReason: string | null;
    date: string;
    cancelled: boolean;
  }>(
    `SELECT attempt_no AS "attemptNo", pickup_agent_id AS "agentId", outcome, fail_reason AS "failReason", to_char(scheduled_date,'YYYY-MM-DD') date, cancelled_at IS NOT NULL AS cancelled FROM fertilizer_deliveries`,
  );
  const settings = await q<{ value: { mismatchTolerancePct?: number } }>(
    `SELECT value FROM system_settings WHERE key = 'collection'`,
  );
  return {
    facts: await loadFacts(db),
    employees,
    agents,
    attendance,
    weekdays,
    overrides,
    assignments,
    collections: collections.map((c) => ({
      ...c,
      estateKg: Number(c.estateKg),
      factoryKg: c.factoryKg === null ? null : Number(c.factoryKg),
    })),
    deliveries,
    tolerancePct: settings[0]?.value?.mismatchTolerancePct ?? 5,
    today,
  };
}
