/**
 * Expected Performance figures, computed straight from the rows in the database — written
 * independently of PerformanceService (its own route-day resolution and arithmetic), so the
 * comparison can catch a bug on either side. Follows Performance-Addendum §3–4 as specified.
 * Only the holiday calendar rule (working-days.ts `dayInfo`) is shared.
 */
import {
  type CalendarFacts,
  datesBetween,
  dayInfo,
} from '../holidays/working-days';

export interface Rows {
  facts: CalendarFacts;
  employees: {
    id: number;
    name: string;
    role: string;
    category: 'factory' | 'office';
    status: string;
  }[];
  agents: { id: number; employeeId: number }[];
  attendance: { employeeId: number; date: string; status: string }[];
  weekdays: { routeId: number; weekday: number }[];
  overrides: { routeId: number; date: string; kind: string }[];
  assignments: {
    id: number;
    routeId: number;
    agentId: number;
    type: string;
    status: string;
    validFrom: string;
    validTo: string | null;
  }[];
  collections: {
    id: string;
    routeId: number | null;
    date: string;
    status: string;
    agentId: number | null;
    estateKg: number;
    /** sum of grade lines; null when ungraded */
    factoryKg: number | null;
  }[];
  deliveries: {
    attemptNo: number;
    agentId: number | null;
    outcome: string | null;
    failReason: string | null;
    date: string;
    cancelled: boolean;
  }[];
  tolerancePct: number;
  /** the last day that counts (data end) */
  today: string;
}

const STOP = ['approved', 'agent_assigned', 'collected', 'confirmed'];
const VISITED = ['collected', 'confirmed'];
const OWNER = ['owner_not_available', 'owner_refused'];

export interface Fig {
  /** rendered text, e.g. "90% (18/20)" or "Not enough data" */
  text: string;
  value: number | null;
  num: number | null;
  den: number | null;
}

const pct = (n: number, d: number) => Math.round((n / d) * 1000) / 10;
const fig = (n: number, d: number, enough: boolean): Fig =>
  enough && d > 0
    ? {
        text: `${pct(n, d)}% (${trim(n)}/${trim(d)})`,
        value: pct(n, d),
        num: n,
        den: d,
      }
    : { text: 'Not enough data', value: null, num: n, den: d };
const trim = (v: number) => String(Math.round(v * 10) / 10);

function monthsBefore(from: string): { from: string; to: string } {
  const [y, m] = from.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 4, 1));
  const end = new Date(Date.UTC(y, m - 1, 0));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

/** My own "who runs route R on date D": a route that runs that day, a cover before a permanent. */
function runner(rows: Rows, routeId: number, date: string): number | null {
  const o = rows.overrides.find(
    (x) => x.routeId === routeId && x.date === date,
  );
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  const runs = o
    ? o.kind === 'ADD'
    : rows.weekdays.some((w) => w.routeId === routeId && w.weekday === wd);
  if (!runs) return null;
  const live = rows.assignments.filter(
    (a) =>
      a.routeId === routeId &&
      a.status === 'ACTIVE' &&
      a.validFrom <= date &&
      (a.validTo === null || a.validTo >= date),
  );
  const latest = (t: string) =>
    live
      .filter((a) => a.type === t)
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom) || b.id - a.id)[0];
  return (latest('COVER') ?? latest('PERMANENT'))?.agentId ?? null;
}

export interface PersonExpected {
  employeeId: number;
  name: string;
  role: string;
  attendance: Fig;
  absences: number;
  leave: number;
  unmarked: number;
  route?: Fig;
  kgTotal?: number;
  kgVsRoute?: Fig;
  routeDays?: number;
  weight?: Fig;
  fertilizer?: Fig & { ownerSide: number; other: number };
  covers?: Fig;
}

export function expectedFor(
  rows: Rows,
  from: string,
  to: string,
): PersonExpected[] {
  const last = to < rows.today ? to : rows.today;
  const dates = datesBetween(from, last);
  const routeIds = [...new Set(rows.weekdays.map((w) => w.routeId))];
  const before = monthsBefore(from);
  const out: PersonExpected[] = [];

  for (const e of rows.employees
    .filter((x) => x.status === 'Active')
    .sort((a, b) => a.name.localeCompare(b.name))) {
    // attendance
    let present = 0;
    let expected = 0;
    let absences = 0;
    let leave = 0;
    let unmarked = 0;
    for (const d of dates) {
      const day = dayInfo(d, { id: e.id, category: e.category }, rows.facts);
      if (!day.working) continue;
      const s = rows.attendance.find(
        (a) => a.employeeId === e.id && a.date === d,
      )?.status;
      if (s === 'Leave') {
        leave += 1;
        continue;
      }
      if (!s) {
        unmarked += 1;
        continue;
      }
      expected += day.weight;
      if (s === 'Absent') absences += 1;
      else if (s === 'Half-day') present += Math.min(0.5, day.weight);
      else present += day.weight;
    }
    const p: PersonExpected = {
      employeeId: e.id,
      name: e.name,
      role: e.role,
      attendance: fig(present, expected, expected >= 5),
      absences,
      leave,
      unmarked,
    };
    const agentId = rows.agents.find((a) => a.employeeId === e.id)?.id ?? null;
    if (agentId !== null) {
      // route days and stops
      const days: { date: string; routeId: number }[] = [];
      for (const d of dates)
        for (const r of routeIds)
          if (runner(rows, r, d) === agentId)
            days.push({ date: d, routeId: r });
      const on = (r: number, d: string) =>
        rows.collections.filter(
          (c) => c.routeId === r && c.date === d && STOP.includes(c.status),
        );
      const stops = days.flatMap((x) => on(x.routeId, x.date));
      const visited = stops.filter((c) => VISITED.includes(c.status)).length;
      p.route = fig(
        visited,
        stops.length,
        days.length >= 5 && stops.length > 0,
      );
      p.routeDays = days.length;

      // kg
      const mine = rows.collections.filter(
        (c) =>
          c.agentId === agentId &&
          VISITED.includes(c.status) &&
          c.date >= from &&
          c.date <= last,
      );
      p.kgTotal =
        Math.round(mine.reduce((s, c) => s + c.estateKg, 0) * 10) / 10;
      let actual = 0;
      let exp = 0;
      let compared = 0;
      for (const x of days.filter((x) => on(x.routeId, x.date).length > 0)) {
        const hist = new Map<string, number>();
        for (const c of rows.collections) {
          if (
            c.routeId === x.routeId &&
            VISITED.includes(c.status) &&
            c.date >= before.from &&
            c.date <= before.to
          ) {
            hist.set(c.date, (hist.get(c.date) ?? 0) + c.estateKg);
          }
        }
        if (hist.size < 5) continue;
        const avg = [...hist.values()].reduce((s, v) => s + v, 0) / hist.size;
        compared += 1;
        exp += avg;
        actual += rows.collections
          .filter(
            (c) =>
              c.agentId === agentId &&
              c.routeId === x.routeId &&
              c.date === x.date &&
              VISITED.includes(c.status),
          )
          .reduce((s, c) => s + c.estateKg, 0);
      }
      // the % is actual ÷ expected on the exact kg; the counts are shown rounded
      p.kgVsRoute =
        compared >= 5 && exp > 0
          ? {
              text: `${pct(actual, exp)}% (${Math.round(actual)}/${Math.round(exp)} kg)`,
              value: pct(actual, exp),
              num: Math.round(actual),
              den: Math.round(exp),
            }
          : { text: 'Not enough data', value: null, num: null, den: null };

      // weight accuracy
      const graded = mine.filter((c) => c.factoryKg !== null);
      const outside = graded.filter(
        (c) =>
          Math.abs(c.estateKg - c.factoryKg!) / c.estateKg >
          rows.tolerancePct / 100,
      ).length;
      p.weight = fig(outside, graded.length, graded.length >= 5);

      // fertilizer first attempts
      const first = rows.deliveries.filter(
        (d) =>
          d.attemptNo === 1 &&
          d.agentId === agentId &&
          d.outcome &&
          !d.cancelled &&
          d.date >= from &&
          d.date <= last,
      );
      const failed = first.filter((d) => d.outcome === 'failed');
      const ownerSide = failed.filter(
        (d) => d.failReason && OWNER.includes(d.failReason),
      ).length;
      p.fertilizer = {
        ...fig(first.length - failed.length, first.length, first.length >= 5),
        ownerSide,
        other: failed.length - ownerSide,
      };

      // cover help (information only)
      const covers = rows.assignments.filter(
        (a) =>
          a.type === 'COVER' &&
          a.agentId === agentId &&
          a.validFrom >= from &&
          a.validFrom <= last,
      );
      const answered = covers.filter((a) =>
        ['ACTIVE', 'DECLINED', 'EXPIRED'].includes(a.status),
      );
      const accepted = answered.filter((a) => a.status === 'ACTIVE').length;
      p.covers = answered.length
        ? {
            text: `${pct(accepted, answered.length)}% (${accepted}/${answered.length})`,
            value: pct(accepted, answered.length),
            num: accepted,
            den: answered.length,
          }
        : { text: 'No requests', value: null, num: 0, den: 0 };
    }
    out.push(p);
  }
  return out;
}

/** The markdown report (also printed). */
export function renderReport(
  sections: { title: string; people: PersonExpected[] }[],
  tolerancePct: number,
): string {
  const lines: string[] = [
    '# Demo seed — expected Performance figures',
    '',
    'Generated by `npm run seed:demo` (local only). Computed directly from the rows in the database (demo + any existing rows), independently of PerformanceService. Weight tolerance: ' +
      `${tolerancePct}% (collection.mismatchTolerancePct).`,
    '',
  ];
  for (const s of sections) {
    lines.push(`## ${s.title}`, '', '### Collection agents', '');
    lines.push(
      '| Agent | Attendance | Unplanned absences | Route completion | Kg collected | Kg vs route average | Weight outside tolerance | Fertilizer first attempt | Cover help |',
    );
    lines.push('|---|---|---|---|---|---|---|---|---|');
    for (const p of s.people.filter((x) => x.route)) {
      lines.push(
        `| ${p.name} | ${p.attendance.text}${p.leave ? ` · leave ${p.leave}` : ''}${p.unmarked ? ` · ${p.unmarked} not marked` : ''} | ${p.attendance.value === null ? 'Not enough data' : p.absences} | ${p.route!.text} · ${p.routeDays} route days | ${p.kgTotal} kg | ${p.kgVsRoute!.text} | ${p.weight!.text} | ${p.fertilizer!.text}${p.fertilizer!.ownerSide + p.fertilizer!.other ? ` · failed: ${p.fertilizer!.ownerSide} owner-side, ${p.fertilizer!.other} other` : ''} | ${p.covers!.text} |`,
      );
    }
    lines.push(
      '',
      '### Other staff',
      '',
      '| Employee | Role | Attendance | Unplanned absences | Leave days |',
      '|---|---|---|---|---|',
    );
    for (const p of s.people.filter((x) => !x.route)) {
      lines.push(
        `| ${p.name} | ${p.role} | ${p.attendance.text}${p.unmarked ? ` · ${p.unmarked} not marked` : ''} | ${p.attendance.value === null ? 'Not enough data' : p.absences} | ${p.leave} |`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}
