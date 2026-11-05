/**
 * Performance measures (Performance-Addendum §3–4) — every formula as a pure function, so the
 * team table, the employee tab and any report get the same numbers from PerformanceService.
 *
 * Rules that hold for all of them:
 *   • figures are facts with their counts — never a combined or overall score;
 *   • holidays, rest days, approved leave and cancelled route days are left out of every
 *     denominator;
 *   • too little data → "Not enough data", never a percentage;
 *   • comparisons are only with the person's own past or with others in the same role.
 */

export type MeasureKey =
  | 'attendance'
  | 'absences'
  | 'leave'
  | 'routeCompletion'
  | 'kg'
  | 'weightAccuracy'
  | 'fertilizer'
  | 'coverHelp';

/** ok = a figure · not_enough = below the minimum data · info = shown, never marked up/down */
export type MeasureStatus = 'ok' | 'not_enough' | 'info';
export type Trend = 'up' | 'down' | 'same';

export interface Measure {
  key: MeasureKey;
  status: MeasureStatus;
  /** % for rates, a count for absences / leave, kg for kg */
  value: number | null;
  /** the counts behind a rate: num / den */
  num: number | null;
  den: number | null;
  /** against the person's own previous 3 months (null for info measures / no history) */
  trend: Trend | null;
  /** what the trend compared against, e.g. 88.9 */
  previous: number | null;
  /** extra figures for the cell, e.g. kg vs route average */
  extra?: Record<string, number | string | null>;
  /** why "Not enough data" */
  reason?: string;
}

/** Below this, a rate is "Not enough data". */
export const MIN_ROUTE_DAYS = 5;
export const MIN_DELIVERIES = 5;
export const MIN_WORKING_DAYS = 5;
/** A route's own average needs this many collection days in the previous 3 months. */
export const MIN_ROUTE_HISTORY_DAYS = 5;

const pct = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 1000) / 10 : null;

// ── attendance ────────────────────────────────────────────────────────────

export interface AttendanceDay {
  date: string;
  /** from working-days.ts dayInfo: holidays and rest days are not working days */
  working: boolean;
  /** 1 for a full day, 0.5 for a half day (category half day) */
  weight: number;
  /** null = not marked */
  status: 'Present' | 'Absent' | 'Leave' | 'Half-day' | 'Short leave' | null;
}

/**
 * Attendance rate = present days (half-day = 0.5) ÷ (working days − leave days).
 * Holidays and rest days aren't working days; leave never lowers the rate; a day nobody
 * marked is left out too (a data gap is not an absence) and counted in `extra.unmarked`.
 */
export function attendanceMeasures(days: AttendanceDay[]): {
  attendance: Measure;
  absences: Measure;
  leave: Measure;
} {
  let present = 0;
  let expected = 0;
  let absent = 0;
  let leave = 0;
  let unmarked = 0;
  for (const d of days) {
    if (!d.working) continue;
    if (d.status === 'Leave') {
      leave += 1;
      continue;
    }
    if (d.status === null) {
      unmarked += 1;
      continue;
    }
    expected += d.weight;
    if (d.status === 'Absent') absent += 1;
    else if (d.status === 'Half-day') present += Math.min(0.5, d.weight);
    else present += d.weight;
  }
  const enough = expected >= MIN_WORKING_DAYS;
  return {
    attendance: {
      key: 'attendance',
      status: enough ? 'ok' : 'not_enough',
      value: enough ? pct(present, expected) : null,
      num: present,
      den: expected,
      trend: null,
      previous: null,
      extra: { unmarked, leaveDays: leave },
      ...(enough
        ? {}
        : { reason: `Fewer than ${MIN_WORKING_DAYS} working days marked` }),
    },
    absences: {
      key: 'absences',
      status: enough ? 'ok' : 'not_enough',
      value: absent,
      num: absent,
      den: null,
      trend: null,
      previous: null,
      ...(enough
        ? {}
        : { reason: `Fewer than ${MIN_WORKING_DAYS} working days marked` }),
    },
    leave: {
      key: 'leave',
      status: 'info',
      value: leave,
      num: leave,
      den: null,
      trend: null,
      previous: null,
    },
  };
}

// ── route completion ──────────────────────────────────────────────────────

export interface Stop {
  date: string;
  routeId: number;
  estateName: string;
  /** collected / confirmed = visited */
  visited: boolean;
}

/**
 * Route completion = stops visited ÷ stops scheduled on their route days (own routes and
 * accepted covers). Stops on cancelled days (holiday / closure) never reach this — the caller
 * only passes stops on route days that actually ran.
 */
export function routeCompletion(stops: Stop[], routeDays: number): Measure {
  const visited = stops.filter((s) => s.visited).length;
  const enough = routeDays >= MIN_ROUTE_DAYS && stops.length > 0;
  return {
    key: 'routeCompletion',
    status: enough ? 'ok' : 'not_enough',
    value: enough ? pct(visited, stops.length) : null,
    num: visited,
    den: stops.length,
    trend: null,
    previous: null,
    extra: { routeDays, missed: stops.length - visited },
    ...(enough
      ? {}
      : {
          reason:
            routeDays < MIN_ROUTE_DAYS
              ? `Fewer than ${MIN_ROUTE_DAYS} route days`
              : 'No stops on their route days',
        }),
  };
}

// ── kg ────────────────────────────────────────────────────────────────────

export interface RouteDayKg {
  date: string;
  routeId: number;
  /** kg the agent collected on that route that day */
  kg: number;
  /** that ROUTE's average kg per route day over the previous 3 months (null = no history) */
  routeAverage: number | null;
}

/**
 * Kg collected = total kg; and kg per route day against THAT route's own average for the
 * previous 3 months (actual ÷ expected). A cover day is measured against the covered route's
 * history. Kg is never compared between agents on different routes.
 */
export function kgMeasure(days: RouteDayKg[], totalKg: number): Measure {
  const withHistory = days.filter(
    (d) => d.routeAverage !== null && d.routeAverage > 0,
  );
  const actual = withHistory.reduce((s, d) => s + d.kg, 0);
  const expected = withHistory.reduce((s, d) => s + (d.routeAverage ?? 0), 0);
  const enough = withHistory.length >= MIN_ROUTE_DAYS;
  return {
    key: 'kg',
    status: enough ? 'ok' : 'not_enough',
    value: Math.round(totalKg * 10) / 10,
    num: enough ? Math.round(actual) : null,
    den: enough ? Math.round(expected) : null,
    trend: null,
    previous: null,
    extra: {
      routeDays: days.length,
      vsRouteAverage: enough ? pct(actual, expected) : null,
    },
    ...(enough
      ? {}
      : {
          reason: `Fewer than ${MIN_ROUTE_DAYS} route days with a route history to compare`,
        }),
  };
}

// ── weight accuracy ───────────────────────────────────────────────────────

export interface GradedDelivery {
  id: string;
  date: string;
  estateName: string;
  /** what the agent recorded at the estate */
  estateKg: number;
  /** the factory's graded total (current = latest approved revision) */
  factoryKg: number;
}

/** |estate − factory| ÷ estate, as a fraction. */
export const weightGap = (d: Pick<GradedDelivery, 'estateKg' | 'factoryKg'>) =>
  d.estateKg > 0 ? Math.abs(d.estateKg - d.factoryKg) / d.estateKg : 0;

/**
 * Weight accuracy = graded deliveries whose estate and factory weights differ by MORE than the
 * tolerance ÷ all graded deliveries. Leaf naturally loses some weight on the way, hence the
 * tolerance (system_settings.collection.mismatchTolerancePct, shared with grading).
 */
export function weightAccuracy(
  deliveries: GradedDelivery[],
  tolerancePct: number,
): Measure {
  const outside = outsideTolerance(deliveries, tolerancePct);
  const enough = deliveries.length >= MIN_DELIVERIES;
  return {
    key: 'weightAccuracy',
    status: enough ? 'ok' : 'not_enough',
    value: enough ? pct(outside.length, deliveries.length) : null,
    num: outside.length,
    den: deliveries.length,
    trend: null,
    previous: null,
    extra: { tolerancePct },
    ...(enough
      ? {}
      : { reason: `Fewer than ${MIN_DELIVERIES} graded deliveries` }),
  };
}

/** The graded deliveries outside the tolerance — the drill-down list. */
export function outsideTolerance(
  deliveries: GradedDelivery[],
  tolerancePct: number,
): GradedDelivery[] {
  return deliveries.filter((d) => weightGap(d) > tolerancePct / 100);
}

// ── fertilizer ────────────────────────────────────────────────────────────

export type FailReason =
  | 'owner_not_available'
  | 'road_not_passable'
  | 'owner_refused'
  | 'wrong_estate'
  | 'other';

/** Reasons on the owner's side — not the agent's doing. */
export const OWNER_SIDE: FailReason[] = [
  'owner_not_available',
  'owner_refused',
];

export interface FirstAttempt {
  outcome: 'delivered' | 'partial' | 'failed';
  failReason: FailReason | null;
}

/**
 * Fertilizer first-attempt success = deliveries handed over on the first attempt (delivered or
 * partial) ÷ deliveries first attempted. Failure reasons are broken down, owner-side apart.
 */
export function fertilizerFirstAttempt(rows: FirstAttempt[]): Measure {
  const ok = rows.filter((r) => r.outcome !== 'failed').length;
  const failed = rows.filter((r) => r.outcome === 'failed');
  const reasons: Record<string, number> = {};
  for (const f of failed) {
    const k = f.failReason ?? 'other';
    reasons[k] = (reasons[k] ?? 0) + 1;
  }
  const ownerSide = failed.filter(
    (f) => f.failReason && OWNER_SIDE.includes(f.failReason),
  ).length;
  const enough = rows.length >= MIN_DELIVERIES;
  return {
    key: 'fertilizer',
    status: enough ? 'ok' : 'not_enough',
    value: enough ? pct(ok, rows.length) : null,
    num: ok,
    den: rows.length,
    trend: null,
    previous: null,
    extra: { ownerSide, otherFailures: failed.length - ownerSide, ...reasons },
    ...(enough
      ? {}
      : { reason: `Fewer than ${MIN_DELIVERIES} first attempts` }),
  };
}

// ── cover help (information only) ────────────────────────────────────────

/** Cover requests accepted ÷ received (accepted, declined or expired). Never marked up or down. */
export function coverHelp(
  statuses: ('PENDING' | 'ACTIVE' | 'DECLINED' | 'EXPIRED' | 'CANCELLED')[],
): Measure {
  const answered = statuses.filter(
    (s) => s === 'ACTIVE' || s === 'DECLINED' || s === 'EXPIRED',
  );
  const accepted = answered.filter((s) => s === 'ACTIVE').length;
  return {
    key: 'coverHelp',
    status: 'info',
    value: answered.length > 0 ? pct(accepted, answered.length) : null,
    num: accepted,
    den: answered.length,
    trend: null,
    previous: null,
  };
}

// ── comparisons ───────────────────────────────────────────────────────────

/** Rates within this many points of before are "same". */
export const SAME_WITHIN_POINTS = 2;

/**
 * Up / down / same against the person's OWN previous 3 months. Neutral — "up" is not "better"
 * (more absences is up too). Information measures and missing history get no mark.
 */
export function trendOf(current: Measure, previous: Measure | null): Measure {
  if (!previous || current.status !== 'ok' || previous.status !== 'ok')
    return current;
  if (current.key === 'coverHelp' || current.key === 'leave') return current;
  let now: number | null;
  let before: number | null;
  if (current.key === 'kg') {
    now = (current.extra?.vsRouteAverage as number | null) ?? null;
    before = (previous.extra?.vsRouteAverage as number | null) ?? null;
  } else if (current.key === 'absences') {
    // previous is 3 months: compare with its monthly average
    now = current.value;
    before =
      previous.value === null
        ? null
        : Math.round((previous.value / 3) * 10) / 10;
  } else {
    now = current.value;
    before = previous.value;
  }
  if (now === null || before === null) return current;
  const within = current.key === 'absences' ? 0.5 : SAME_WITHIN_POINTS;
  const trend: Trend =
    Math.abs(now - before) < within ? 'same' : now > before ? 'up' : 'down';
  return { ...current, trend, previous: before };
}

/** The column header's figure: the average over people whose measure is a figure. */
export function averageOf(measures: Measure[]): number | null {
  const ok = measures.filter((m) => m.status !== 'not_enough');
  const values = ok
    .map((m) =>
      m.key === 'kg' ? (m.extra?.vsRouteAverage as number | null) : m.value,
    )
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return (
    Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
  );
}

// ── notes: facts only, from rules ─────────────────────────────────────────

/**
 * Notes a Manager can start a conversation with — facts and counts, no adjectives, no verdicts.
 * "3 unplanned absences in October (agent average 1)."
 */
export function factNotes(
  m: Partial<Record<MeasureKey, Measure>>,
  averages: Partial<Record<MeasureKey, number | null>>,
  period: string,
  group: 'agent' | 'role',
): string[] {
  const out: string[] = [];
  const avgWord = group === 'agent' ? 'agent average' : 'role average';
  const a = m.absences;
  if (
    a?.status === 'ok' &&
    (a.value ?? 0) > 0 &&
    (a.value ?? 0) > (averages.absences ?? 0)
  ) {
    out.push(
      `${a.value} unplanned absence${a.value === 1 ? '' : 's'} in ${period} (${avgWord} ${fmt(averages.absences)}).`,
    );
  }
  const r = m.routeCompletion;
  const missed = Number(r?.extra?.missed ?? 0);
  if (r?.status === 'ok' && missed > 0) {
    out.push(
      `${missed} stop${missed === 1 ? '' : 's'} not collected on their route days in ${period}.`,
    );
  }
  const w = m.weightAccuracy;
  if (w?.status === 'ok' && (w.num ?? 0) > 0) {
    out.push(
      `${w.num} of ${w.den} graded deliveries differed from the estate weight by more than ${w.extra?.tolerancePct}% in ${period}.`,
    );
  }
  const f = m.fertilizer;
  const other = Number(f?.extra?.otherFailures ?? 0);
  if (f?.status === 'ok' && other > 0) {
    out.push(
      `${other} fertilizer first attempt${other === 1 ? '' : 's'} failed for reasons other than the owner in ${period}.`,
    );
  }
  return out;
}

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : String(v);
