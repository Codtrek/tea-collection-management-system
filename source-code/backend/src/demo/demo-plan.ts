/**
 * The demo data plan (local testing only — see seed-demo.ts). Pure and deterministic: the same
 * context gives the same rows every time (mulberry32, fixed seed). Every row is checked against
 * the business rules with the codebase's own rule functions before it is planned:
 *   • the holiday calendar and weekly holidays — working-days.ts `dayInfo`
 *   • whether a route runs that day — route-schedule.service.ts `isScheduledOn`
 *   • who runs it (own route or accepted cover) — route-resolver.service.ts `pickResponsible`
 * Nothing here touches the database.
 */
import { pickResponsible } from '../dispatch/route-resolver.service';
import {
  isScheduledOn,
  type RouteSchedule,
} from '../dispatch/route-schedule.service';
import {
  type CalendarFacts,
  datesBetween,
  dayInfo,
} from '../holidays/working-days';

export const DEMO_SEED = 2026;
export const DEMO_ACTOR = 'Demo seed';

// ── deterministic randomness ──────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng: () => number, lo: number, hi: number) =>
  lo + (hi - lo) * rng();
const intBetween = (rng: () => number, lo: number, hi: number) =>
  Math.floor(between(rng, lo, hi + 1));
const round1 = (v: number) => Math.round(v * 10) / 10;

// ── the context the plan is built from ───────────────────────────────────

export interface Assignment {
  id: number;
  routeId: number;
  agentId: number;
  type: 'PERMANENT' | 'COVER';
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  validFrom: string;
  validTo: string | null;
}

export interface DemoContext {
  /** collections start (route history) */
  start: string;
  /** attendance, covers and fertilizer start */
  attendanceStart: string;
  /** the last day with data (yesterday) */
  end: string;
  facts: CalendarFacts;
  routes: { id: number; name: string; schedule: RouteSchedule }[];
  /** existing + demo PERMANENT assignments (covers are planned here) */
  assignments: Assignment[];
  /** the demo estates (collections are only planned for these) */
  estates: { id: number; name: string; routeId: number; ownerName: string }[];
  agents: { id: number; employeeId: number; name: string }[];
  staff: { id: number; name: string; category: 'factory' | 'office' }[];
  /** "employeeId:date" — dates that already have attendance (never overwritten) */
  existingAttendance: Set<string>;
  /** agent name → collection agent id, for the scenario */
  agentId: Record<'SEN' | 'GUN' | 'WEE' | 'PER' | 'SIL', number>;
  /** staff name → employee id, for the scenario */
  staffId: Record<'DRIVER' | 'KPERERA' | 'NSILVA' | 'SFERNANDO', number>;
}

// ── the scenario (Performance demo stories) ───────────────────────────────

type AgentKey = keyof DemoContext['agentId'];
type Mark = 'Present' | 'Absent' | 'Leave' | 'Half-day' | 'Short leave';

interface PlannedMark {
  status: Mark;
  half?: 'AM' | 'PM';
  shortOut?: string;
  shortBack?: string;
}

/** Days off the normal "Present" for agents. */
const AGENT_MARKS: Record<AgentKey, Record<string, PlannedMark>> = {
  SEN: {
    '2026-09-16': { status: 'Half-day', half: 'AM' }, // a Wednesday, no route
    '2026-10-21': { status: 'Leave' }, // a Wednesday, no route
  },
  GUN: {
    '2026-09-07': { status: 'Absent' }, // Monday route day — N. Perera covers
    '2026-10-14': { status: 'Absent' }, // Wednesday route day — cover declined
  },
  WEE: {
    '2026-10-15': { status: 'Absent' }, // Thursday route day — N. Perera covers
    '2026-10-23': { status: 'Absent' }, // Friday, no route
  },
  PER: Object.fromEntries(
    ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'].map(
      (d) => [d, { status: 'Leave' as const }],
    ),
  ),
  SIL: {},
};

/** D. Silva joined on 20 Oct: nothing before. */
const STARTS: Partial<Record<AgentKey, string>> = { SIL: '2026-10-20' };

/** Cover requests to N. Perera: 2 accepted, 1 declined (she runs Route 7 on Wednesdays). */
const COVERS: { absent: AgentKey; date: string; accept: boolean }[] = [
  { absent: 'GUN', date: '2026-09-07', accept: true },
  { absent: 'WEE', date: '2026-10-15', accept: true },
  { absent: 'GUN', date: '2026-10-14', accept: false },
];

/** The only "Worked on holiday" days (route days that fall on a holiday and still ran). */
const WORKED_HOLIDAYS: { agent: AgentKey; date: string }[] = [
  { agent: 'GUN', date: '2026-08-26' },
  { agent: 'SEN', date: '2026-08-27' },
  { agent: 'WEE', date: '2026-08-27' },
];

/** Share of stops collected, per agent and month (history months: 97%). */
function completionTarget(agent: AgentKey, month: string): number {
  if (month < '2026-08') return 0.97;
  if (agent === 'SEN') return 0.97;
  if (agent === 'GUN') return 0.85;
  if (agent === 'WEE')
    return month === '2026-08'
      ? 0.97
      : month === '2026-09'
        ? 0.9
        : month === '2026-10'
          ? 0.8
          : 0.9;
  return 0.95;
}

/** Deliveries planned outside the weight tolerance (loss above 5%), per agent and month. */
const OUTLIERS: Partial<Record<AgentKey, Record<string, number>>> = {
  SEN: { '2026-09': 1 },
  GUN: { '2026-08': 1, '2026-09': 1, '2026-10': 2 },
  WEE: { '2026-10': 3 },
};

/** Fertilizer requests: target date (first route day on/after), then the attempt outcomes. */
const FERTILIZER: {
  agent: AgentKey;
  from: string;
  attempts: ('delivered' | 'owner_not_available' | 'road_not_passable')[];
}[] = [
  { agent: 'SEN', from: '2026-08-10', attempts: ['delivered'] },
  { agent: 'SEN', from: '2026-09-03', attempts: ['delivered'] },
  { agent: 'SEN', from: '2026-09-22', attempts: ['delivered'] },
  { agent: 'SEN', from: '2026-10-06', attempts: ['delivered'] },
  { agent: 'SEN', from: '2026-10-19', attempts: ['delivered'] },
  { agent: 'GUN', from: '2026-08-12', attempts: ['delivered'] },
  { agent: 'GUN', from: '2026-09-09', attempts: ['delivered'] },
  {
    agent: 'GUN',
    from: '2026-10-05',
    attempts: ['road_not_passable', 'delivered'],
  },
  { agent: 'WEE', from: '2026-08-13', attempts: ['delivered'] },
  { agent: 'WEE', from: '2026-10-08', attempts: ['delivered'] },
  { agent: 'PER', from: '2026-08-18', attempts: ['delivered'] },
  {
    agent: 'PER',
    from: '2026-09-08',
    attempts: ['owner_not_available', 'delivered'],
  },
  {
    agent: 'PER',
    from: '2026-10-06',
    attempts: ['owner_not_available', 'delivered'],
  },
  { agent: 'PER', from: '2026-10-23', attempts: ['delivered'] },
  { agent: 'SIL', from: '2026-10-28', attempts: ['delivered'] },
];

/** Other staff: their days off the normal "Present". */
function staffMarks(
  ctx: DemoContext,
): Record<number, Record<string, PlannedMark>> {
  return {
    [ctx.staffId.DRIVER]: {
      '2026-08-12': { status: 'Absent' },
      '2026-09-22': { status: 'Absent' },
      '2026-10-06': { status: 'Absent' },
    },
    [ctx.staffId.KPERERA]: {
      '2026-10-08': { status: 'Leave' },
      '2026-10-09': { status: 'Leave' },
    },
    [ctx.staffId.NSILVA]: {
      '2026-08-19': { status: 'Half-day', half: 'AM' },
      '2026-10-28': { status: 'Half-day', half: 'PM' },
    },
    [ctx.staffId.SFERNANDO]: {
      '2026-09-10': {
        status: 'Short leave',
        shortOut: '10:00',
        shortBack: '12:00',
      },
    },
  };
}

// ── the plan ──────────────────────────────────────────────────────────────

export interface PlannedAttendance {
  employeeId: number;
  date: string;
  status: Mark;
  half: 'AM' | 'PM' | null;
  shortOut: string | null;
  shortBack: string | null;
  holidayWorked: boolean;
  dayHours: number;
}

export interface PlannedCover {
  routeId: number;
  agentId: number;
  date: string;
  status: 'ACTIVE' | 'DECLINED';
  coversAssignmentId: number;
}

export interface PlannedCollection {
  /** DEMO-00001 … */
  id: string;
  estateId: number;
  estateName: string;
  routeId: number;
  routeName: string;
  date: string;
  agentId: number;
  agentName: string;
  estateKg: number;
  visited: boolean;
  /** graded lines when visited: factory total = super + normal */
  superKg: number | null;
  normalKg: number | null;
  outlier: boolean;
}

export interface PlannedFertilizer {
  estateId: number;
  ownerName: string;
  routeId: number;
  agentId: number;
  qtyKg: number;
  requestedOn: string;
  attempts: {
    date: string;
    outcome: 'delivered' | 'failed';
    failReason: 'owner_not_available' | 'road_not_passable' | null;
  }[];
}

export interface DemoPlan {
  attendance: PlannedAttendance[];
  agentAbsences: { agentId: number; date: string; reason: string }[];
  covers: PlannedCover[];
  collections: PlannedCollection[];
  fertilizer: PlannedFertilizer[];
}

const HOURS: Record<Mark, number> = {
  Present: 8,
  'Short leave': 8,
  'Half-day': 4,
  Absent: 0,
  Leave: 0,
};

export function buildPlan(ctx: DemoContext): DemoPlan {
  const rng = mulberry32(DEMO_SEED);
  const keyOf = (k: AgentKey) => ctx.agentId[k];
  const agentKeyOf = (id: number) =>
    (Object.keys(ctx.agentId) as AgentKey[]).find(
      (k) => ctx.agentId[k] === id,
    )!;
  const agentById = new Map(ctx.agents.map((a) => [a.id, a]));
  const category = 'factory' as const;

  // 1. covers — check them against the rules before using them
  const permanentFor = (routeId: number, date: string) =>
    pickResponsible(
      ctx.assignments.filter(
        (a) => a.routeId === routeId && a.status === 'ACTIVE',
      ),
      date,
    );
  const covers: PlannedCover[] = COVERS.map((c) => {
    const absent = keyOf(c.absent);
    const route = ctx.routes.find(
      (r) =>
        isScheduledOn(r.schedule, c.date) &&
        permanentFor(r.id, c.date)?.agentId === absent,
    );
    if (!route)
      throw new Error(`Cover ${c.date}: ${c.absent} has no route that day.`);
    const perm = permanentFor(route.id, c.date)!;
    return {
      routeId: route.id,
      agentId: keyOf('PER'),
      date: c.date,
      status: c.accept ? 'ACTIVE' : 'DECLINED',
      coversAssignmentId: perm.assignmentId,
    };
  });
  const assignments: Assignment[] = [
    ...ctx.assignments,
    ...covers.map((c, i) => ({
      id: -1 - i,
      routeId: c.routeId,
      agentId: c.agentId,
      type: 'COVER' as const,
      status: c.status,
      validFrom: c.date,
      validTo: c.date,
    })),
  ];
  const responsible = (routeId: number, date: string) =>
    pickResponsible(
      assignments.filter((a) => a.routeId === routeId && a.status === 'ACTIVE'),
      date,
    );

  // 2. attendance marks (who is off which day)
  const markOf = (agent: AgentKey, date: string): PlannedMark | null => {
    const start = STARTS[agent] ?? ctx.attendanceStart;
    if (date < start) return null;
    return AGENT_MARKS[agent][date] ?? { status: 'Present' };
  };
  const off = (agentId: number, date: string) => {
    if (date < ctx.attendanceStart) return false; // history months: everyone worked their routes
    const m = markOf(agentKeyOf(agentId), date);
    return !m || m.status === 'Absent' || m.status === 'Leave';
  };
  const isHoliday = (date: string) => {
    const t = dayInfo(date, { id: 0, category }, ctx.facts).type;
    return t === 'poya' || t === 'public' || t === 'closure';
  };
  const worked = (agentId: number, date: string) =>
    WORKED_HOLIDAYS.some((w) => keyOf(w.agent) === agentId && w.date === date);

  // 3. route days that ran with an agent at work
  const runs = (routeId: number, date: string): number | null => {
    const r = ctx.routes.find((x) => x.id === routeId)!;
    if (!isScheduledOn(r.schedule, date)) return null;
    const who = responsible(routeId, date);
    if (!who) return null;
    if (isHoliday(date) && !worked(who.agentId, date)) return null;
    if (dayInfo(date, { id: 0, category }, ctx.facts).type === 'weekly')
      return null;
    if (off(who.agentId, date)) return null; // absent, no accepted cover: stops move on
    return who.agentId;
  };
  // an agent works one route a day
  for (const date of datesBetween(ctx.start, ctx.end)) {
    const busy = new Map<number, number>();
    for (const r of ctx.routes) {
      const a = runs(r.id, date);
      if (a === null) continue;
      if (busy.has(a)) {
        throw new Error(
          `${date}: agent ${a} would run two routes (${busy.get(a)} and ${r.id}).`,
        );
      }
      busy.set(a, r.id);
    }
  }

  // 4. collections: each estate supplies every 5–12 days, on its route's next running day
  const rainy = new Set<string>();
  for (const d of datesBetween(ctx.start, ctx.end)) {
    const week = isoWeek(d);
    if (!rainy.has(`?${week}`)) {
      rainy.add(`?${week}`);
      if (rng() < 0.2) rainy.add(week);
    }
  }
  const SEASON: Record<string, number> = {
    '05': 1.1,
    '06': 0.95,
    '07': 0.9,
    '08': 1.0,
    '09': 1.05,
    '10': 1.0,
    '11': 0.95,
  };
  let seq = 0;
  const raw: PlannedCollection[] = [];
  for (const e of ctx.estates) {
    const route = ctx.routes.find((r) => r.id === e.routeId)!;
    const base = between(rng, 30, 85);
    let due = addDays(ctx.start, intBetween(rng, 0, 8));
    while (due <= ctx.end) {
      let day = due;
      while (day <= ctx.end && runs(route.id, day) === null)
        day = addDays(day, 1);
      if (day > ctx.end) break;
      const agentId = runs(route.id, day)!;
      const factor =
        (SEASON[day.slice(5, 7)] ?? 1) *
        (rainy.has(isoWeek(day)) ? 0.7 : 1) *
        between(rng, 0.85, 1.15);
      const kg = Math.min(120, Math.max(15, Math.round(base * factor * 2) / 2));
      seq += 1;
      raw.push({
        id: `DEMO-${String(seq).padStart(5, '0')}`,
        estateId: e.id,
        estateName: e.name,
        routeId: route.id,
        routeName: route.name,
        date: day,
        agentId,
        agentName: agentById.get(agentId)!.name,
        estateKg: kg,
        visited: true,
        superKg: null,
        normalKg: null,
        outlier: false,
      });
      due = addDays(day, intBetween(rng, 5, 12));
    }
  }
  raw.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  // 5. missed stops and weight outliers, per agent and month (deterministic picks)
  const groups = new Map<string, PlannedCollection[]>();
  for (const c of raw) {
    const k = `${c.agentId}:${c.date.slice(0, 7)}`;
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  for (const [k, list] of groups) {
    const [agentId, month] = [Number(k.split(':')[0]), k.split(':')[1]];
    const agent = agentKeyOf(agentId);
    const missed = Math.round(
      list.length * (1 - completionTarget(agent, month)),
    );
    for (const c of pick(rng, list, missed)) c.visited = false;
    const n = OUTLIERS[agent]?.[month] ?? 0;
    for (const c of pick(
      rng,
      list.filter((x) => x.visited),
      n,
    ))
      c.outlier = true;
  }
  for (const c of raw) {
    if (!c.visited) continue;
    // leaf loses 0–4% on the way; a planned outlier 6–9%
    const loss = c.outlier ? between(rng, 0.06, 0.09) : between(rng, 0, 0.04);
    const factory = round1(c.estateKg * (1 - loss));
    const superKg = round1(factory * between(rng, 0.35, 0.6));
    c.superKg = superKg;
    c.normalKg = round1(factory - superKg);
  }

  // 6. attendance: agents and other staff, 1 Aug → end; holidays only when worked
  const attendance: PlannedAttendance[] = [];
  const agentAbsences: DemoPlan['agentAbsences'] = [];
  const push = (
    employeeId: number,
    date: string,
    m: PlannedMark,
    holidayWorked: boolean,
  ) => {
    if (ctx.existingAttendance.has(`${employeeId}:${date}`)) return; // never overwrite real marks
    attendance.push({
      employeeId,
      date,
      status: m.status,
      half: m.half ?? null,
      shortOut: m.shortOut ?? null,
      shortBack: m.shortBack ?? null,
      holidayWorked,
      dayHours: HOURS[m.status],
    });
  };
  for (const a of ctx.agents) {
    const k = agentKeyOf(a.id);
    for (const date of datesBetween(ctx.attendanceStart, ctx.end)) {
      const m = markOf(k, date);
      if (!m) continue;
      const day = dayInfo(date, { id: a.employeeId, category }, ctx.facts);
      if (!day.working) {
        if (worked(a.id, date))
          push(a.employeeId, date, { status: 'Present' }, true);
        continue;
      }
      push(a.employeeId, date, m, false);
      if (m.status === 'Absent' || m.status === 'Leave') {
        agentAbsences.push({
          agentId: a.id,
          date,
          reason: `${DEMO_ACTOR}: ${m.status.toLowerCase()}`,
        });
      }
    }
  }
  const marks = staffMarks(ctx);
  for (const s of ctx.staff) {
    for (const date of datesBetween(ctx.attendanceStart, ctx.end)) {
      const day = dayInfo(date, { id: s.id, category: s.category }, ctx.facts);
      if (!day.working) continue;
      push(s.id, date, marks[s.id]?.[date] ?? { status: 'Present' }, false);
    }
  }

  // 7. fertilizer: on the agent's next running route day from the target date
  const fertilizer: PlannedFertilizer[] = FERTILIZER.map((f) => {
    const agentId = keyOf(f.agent);
    const next = (from: string) => {
      for (let d = from; d <= ctx.end; d = addDays(d, 1)) {
        const r = ctx.routes.find(
          (x) =>
            runs(x.id, d) === agentId &&
            ctx.estates.some((e) => e.routeId === x.id),
        );
        if (r) return { date: d, routeId: r.id };
      }
      throw new Error(`No route day for ${f.agent} from ${f.from}.`);
    };
    const first = next(f.from);
    const estates = ctx.estates.filter((e) => e.routeId === first.routeId);
    const estate = estates[intBetween(rng, 0, estates.length - 1)];
    const attempts: PlannedFertilizer['attempts'] = [];
    let at = first;
    for (const o of f.attempts) {
      if (attempts.length > 0) {
        // a retry: the same route's next running day
        let d = addDays(at.date, 1);
        while (d <= ctx.end && runs(first.routeId, d) !== agentId)
          d = addDays(d, 1);
        if (d > ctx.end)
          throw new Error(`No retry day for ${f.agent} after ${at.date}.`);
        at = { date: d, routeId: first.routeId };
      }
      attempts.push({
        date: at.date,
        outcome: o === 'delivered' ? 'delivered' : 'failed',
        failReason: o === 'delivered' ? null : o,
      });
    }
    return {
      estateId: estate.id,
      ownerName: estate.ownerName,
      routeId: first.routeId,
      agentId,
      qtyKg: intBetween(rng, 2, 8) * 25,
      requestedOn: addDays(first.date, -6),
      attempts,
    };
  });

  return { attendance, agentAbsences, covers, collections: raw, fertilizer };
}

// ── helpers ───────────────────────────────────────────────────────────────

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function isoWeek(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((t.getTime() - first.getTime()) / 86400000 -
        3 +
        ((first.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${t.getUTCFullYear()}-W${week}`;
}

/** n items picked deterministically (seeded shuffle). */
function pick<T>(rng: () => number, list: T[], n: number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}
