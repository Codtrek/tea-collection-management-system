/*
  RPT-01 Collection Report — the rules (docs/specs/Reports-Collection-Addendum.md). Pure functions
  over plain delivery facts, so every number on the page, its totals and the CSV export come from
  one place and can be tested without a database. `CollectionReportService` only loads the rows.
*/

/* ── Deliveries: which ones count, and with which weight ── */

/** Leaf actually reached the factory. Earlier states are plans or requests, not deliveries. */
export const DELIVERED_STATUSES = ['collected', 'confirmed'] as const;

/**
 * graded       delivered and graded — counts, with the FACTORY weight (Σ grade lines)
 * ungraded     delivered, not graded yet — its own column, estate weight only
 * provisional  an exception entry awaiting the agent (`provisional` set) — counted apart, excluded
 * notDelivered agent_assigned / approved / submitted — not leaf yet, excluded
 * (There is no cancelled status.)
 */
export type DeliveryBucket =
  | 'graded'
  | 'ungraded'
  | 'provisional'
  | 'notDelivered';

export interface DeliveryInput {
  id: string;
  status: string;
  /** 'YYYY-MM-DD' — the Colombo calendar day the leaf was collected (a DATE column, no time) */
  collectionDate: string;
  estateId: number | null;
  estateName: string;
  routeId: number | null;
  routeName: string;
  agentId: number | null;
  agentName: string;
  /** estate weight, as weighed at the estate */
  weightKg: string | number;
  /**
   * The CURRENT grade lines. Grading rewrites them on every applied revision (initial grade,
   * open-window edit, approved correction), so they are the latest approved revision; a pending
   * correction request never touches them.
   */
  gradeLines?: { grade: string; weightKg: string | number }[] | null;
  provisional?: unknown;
}

export interface DeliveryFact {
  id: string;
  date: string;
  estateId: number | null;
  estateName: string;
  routeId: number | null;
  routeName: string;
  agentId: number | null;
  agentName: string;
  bucket: DeliveryBucket;
  estateKg: number;
  /** Σ grade lines (0 unless graded) */
  factoryKg: number;
  superKg: number;
  normalKg: number;
  demo: boolean;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function bucketOf(
  d: Pick<DeliveryInput, 'status' | 'gradeLines' | 'provisional'>,
): DeliveryBucket {
  if (d.provisional) return 'provisional';
  if (!(DELIVERED_STATUSES as readonly string[]).includes(d.status))
    return 'notDelivered';
  return (d.gradeLines ?? []).length > 0 ? 'graded' : 'ungraded';
}

export function toFact(d: DeliveryInput, demo = false): DeliveryFact {
  const lines = d.gradeLines ?? [];
  const kgOf = (grade: string) =>
    lines
      .filter((l) => l.grade === grade)
      .reduce((s, l) => s + Number(l.weightKg), 0);
  const superKg = kgOf('super');
  const normalKg = kgOf('normal');
  return {
    id: d.id,
    date: String(d.collectionDate).slice(0, 10),
    estateId: d.estateId,
    estateName: d.estateName,
    routeId: d.routeId,
    routeName: d.routeName,
    agentId: d.agentId,
    agentName: d.agentName,
    bucket: bucketOf(d),
    estateKg: Number(d.weightKg),
    factoryKg: superKg + normalKg,
    superKg,
    normalKg,
    demo,
  };
}

/* ── Filters ── */

export type Grade = 'super' | 'normal';
export type GroupBy = 'estate' | 'route' | 'agent' | 'day';

export interface ReportFilters {
  routeId?: number;
  agentId?: number;
  estateId?: number;
  grade?: Grade;
  /** false hides rows the demo seed created */
  includeDemo: boolean;
}

/**
 * Applies the filters. A grade filter keeps only deliveries carrying that grade and counts only
 * that grade's kg; the estate weight and the weight difference can't be split by grade, so they
 * read as null on the page while a grade filter is on.
 */
export function applyFilters(
  facts: DeliveryFact[],
  f: ReportFilters,
): DeliveryFact[] {
  return facts
    .filter(
      (d) =>
        (f.includeDemo || !d.demo) &&
        (f.routeId === undefined || d.routeId === f.routeId) &&
        (f.agentId === undefined || d.agentId === f.agentId) &&
        (f.estateId === undefined || d.estateId === f.estateId),
    )
    .flatMap((d) => {
      // ungraded and provisional entries carry no grade: they stay, in their own columns
      if (!f.grade || d.bucket !== 'graded') return [d];
      const kg = f.grade === 'super' ? d.superKg : d.normalKg;
      if (kg <= 0) return [];
      return [
        {
          ...d,
          factoryKg: kg,
          superKg: f.grade === 'super' ? kg : 0,
          normalKg: f.grade === 'normal' ? kg : 0,
        },
      ];
    });
}

/* ── Periods (factory calendar, Asia/Colombo) ── */

export interface DateRange {
  /** inclusive, 'YYYY-MM-DD' */
  from: string;
  to: string;
}

export type PeriodInput = {
  month?: string;
  from?: string;
  to?: string;
  thisMonth?: boolean;
};

export interface ResolvedPeriod extends DateRange {
  kind: 'month' | 'custom' | 'thisMonth';
  /** the month key when kind is month/thisMonth */
  month: string | null;
  label: string;
  /** the range reaches today or later: never compared as if complete */
  partial: boolean;
  previous: DateRange;
  lastYear: DateRange;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const parts = (date: string) =>
  date.split('-').map(Number) as [number, number, number];
const daysIn = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 0)).getUTCDate();
export const monthOf = (date: string) => date.slice(0, 7);

export function addDays(date: string, n: number): string {
  const [y, m, d] = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function daysBetween(from: string, to: string): number {
  return (
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        86_400_000,
    ) + 1
  );
}

/** Same calendar day `n` months away; the 31st becomes the month's last day. */
function shiftMonths(date: string, n: number): string {
  const [y, m, d] = parts(date);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const ty = t.getUTCFullYear();
  const tm = t.getUTCMonth() + 1;
  return ymd(ty, tm, Math.min(d, daysIn(ty, tm)));
}

function monthRange(month: string): DateRange {
  const [y, m] = month.split('-').map(Number);
  return { from: `${month}-01`, to: ymd(y, m, daysIn(y, m)) };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${LONG_MONTHS[m - 1]} ${y}`;
}

const dayMonth = (date: string) => {
  const [, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1]}`;
};

function rangeLabel(r: DateRange): string {
  const [fy] = parts(r.from);
  const [ty] = parts(r.to);
  return fy === ty
    ? `${dayMonth(r.from)} – ${dayMonth(r.to)} ${ty}`
    : `${dayMonth(r.from)} ${fy} – ${dayMonth(r.to)} ${ty}`;
}

const isMonthKey = (s: string | undefined): s is string =>
  !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const isDate = (s: string | undefined): s is string =>
  !!s &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/**
 * The period a report covers. Default: the last COMPLETE month. The current month is allowed but
 * is labelled "… so far (1–8 Nov)" and compared like for like (the same days of the previous
 * month / of last year), never as if complete. A future end is clamped to today.
 */
export function resolvePeriod(
  input: PeriodInput,
  today: string,
): ResolvedPeriod {
  const thisMonth = monthOf(today);
  let kind: ResolvedPeriod['kind'];
  let month: string | null = null;
  let range: DateRange;

  if (input.thisMonth || input.month === thisMonth) {
    kind = 'thisMonth';
    month = thisMonth;
    range = { from: `${thisMonth}-01`, to: today };
  } else if (isMonthKey(input.month) && input.month < thisMonth) {
    kind = 'month';
    month = input.month;
    range = monthRange(input.month);
  } else if (
    isDate(input.from) &&
    isDate(input.to) &&
    input.from <= input.to &&
    input.from <= today
  ) {
    kind = 'custom';
    range = { from: input.from, to: input.to > today ? today : input.to };
  } else {
    kind = 'month';
    month = monthOf(shiftMonths(`${thisMonth}-01`, -1));
    range = monthRange(month);
  }

  const partial = range.to >= today;
  const label =
    kind === 'thisMonth'
      ? `${monthLabel(month!)} so far (1–${dayMonth(range.to)})`
      : kind === 'month'
        ? monthLabel(month!)
        : `${rangeLabel(range)}${partial ? ' (so far)' : ''}`;

  // Like for like: a whole month against the whole previous month; anything else (a partial
  // month, a custom range) against the same number of days just before / a year earlier.
  const previous: DateRange =
    kind === 'month'
      ? monthRange(monthOf(shiftMonths(range.from, -1)))
      : kind === 'thisMonth'
        ? { from: shiftMonths(range.from, -1), to: shiftMonths(range.to, -1) }
        : {
            from: addDays(range.from, -daysBetween(range.from, range.to)),
            to: addDays(range.from, -1),
          };
  const lastYear: DateRange = {
    from: shiftMonths(range.from, -12),
    to: shiftMonths(range.to, -12),
  };

  return { kind, month, ...range, label, partial, previous, lastYear };
}

export const inRange = (date: string, r: DateRange) =>
  date >= r.from && date <= r.to;

/* ── Aggregation ── */

export interface Totals {
  /** graded deliveries */
  deliveries: number;
  /** estate weight of the graded deliveries (null under a grade filter) */
  estateKg: number | null;
  factoryKg: number;
  /** (estate − factory) ÷ estate over graded deliveries, % (null under a grade filter) */
  diffPct: number | null;
  /** graded deliveries whose estate and factory weights differ by more than the tolerance */
  overTolerance: number;
  superKg: number;
  normalKg: number;
  /** Super kg ÷ factory kg, % */
  superShare: number | null;
  ungradedDeliveries: number;
  ungradedEstateKg: number;
  provisional: number;
}

/** A graded delivery whose estate and factory weights are further apart than the tolerance — the grading rule. */
export function overTolerance(d: DeliveryFact, tolerancePct: number): boolean {
  return (
    d.bucket === 'graded' &&
    d.estateKg > 0 &&
    (Math.abs(d.factoryKg - d.estateKg) / d.estateKg) * 100 > tolerancePct
  );
}

export function totalsOf(
  facts: DeliveryFact[],
  tolerancePct: number,
  gradeFiltered: boolean,
): Totals {
  const graded = facts.filter((d) => d.bucket === 'graded');
  const ungraded = facts.filter((d) => d.bucket === 'ungraded');
  const sum = (
    rows: DeliveryFact[],
    k: keyof Pick<
      DeliveryFact,
      'estateKg' | 'factoryKg' | 'superKg' | 'normalKg'
    >,
  ) => r2(rows.reduce((s, d) => s + d[k], 0));
  const estateKg = sum(graded, 'estateKg');
  const factoryKg = sum(graded, 'factoryKg');
  const superKg = sum(graded, 'superKg');
  return {
    deliveries: graded.length,
    estateKg: gradeFiltered ? null : estateKg,
    factoryKg,
    diffPct:
      gradeFiltered || estateKg === 0
        ? null
        : r1(((estateKg - factoryKg) / estateKg) * 100),
    overTolerance: gradeFiltered
      ? 0
      : graded.filter((d) => overTolerance(d, tolerancePct)).length,
    superKg,
    normalKg: sum(graded, 'normalKg'),
    superShare: factoryKg > 0 ? r1((superKg / factoryKg) * 100) : null,
    ungradedDeliveries: ungraded.length,
    ungradedEstateKg: sum(ungraded, 'estateKg'),
    provisional: facts.filter((d) => d.bucket === 'provisional').length,
  };
}

/** % change, or null when there is nothing to compare with ("No data"). */
export function changePct(
  now: number,
  before: number | null | undefined,
): number | null {
  if (before === null || before === undefined || before === 0) return null;
  return r1(((now - before) / before) * 100);
}

export interface GroupRow extends Totals {
  key: string;
  name: string;
  /** estates: their route; days: null */
  routeName: string | null;
  /** id to link with (estate → EST-10, route/agent → filter) */
  id: number | null;
  prevFactoryKg: number;
  /** vs the previous period, % (null when it had nothing) */
  changePct: number | null;
}

function groupKey(
  d: DeliveryFact,
  by: GroupBy,
): { key: string; name: string; id: number | null; routeName: string | null } {
  switch (by) {
    case 'route':
      return {
        key: `r${d.routeId ?? d.routeName}`,
        name: d.routeName,
        id: d.routeId,
        routeName: null,
      };
    case 'agent':
      return {
        key: `a${d.agentId ?? d.agentName}`,
        name: d.agentName,
        id: d.agentId,
        routeName: null,
      };
    case 'day':
      return { key: d.date, name: d.date, id: null, routeName: null };
    default:
      return {
        key: `e${d.estateId ?? d.estateName}`,
        name: d.estateName,
        id: d.estateId,
        routeName: d.routeName,
      };
  }
}

/** Rows of the table: one per estate / route / agent / day that delivered (graded or not), largest first. */
export function groupRows(
  facts: DeliveryFact[],
  prevFacts: DeliveryFact[],
  by: GroupBy,
  tolerancePct: number,
  gradeFiltered: boolean,
): GroupRow[] {
  const delivered = facts.filter(
    (d) =>
      d.bucket === 'graded' ||
      d.bucket === 'ungraded' ||
      d.bucket === 'provisional',
  );
  const groups = new Map<
    string,
    { meta: ReturnType<typeof groupKey>; rows: DeliveryFact[] }
  >();
  for (const d of delivered) {
    const meta = groupKey(d, by);
    const g = groups.get(meta.key) ?? { meta, rows: [] };
    g.rows.push(d);
    groups.set(meta.key, g);
  }
  const prevByKey = new Map<string, number>();
  for (const d of prevFacts) {
    if (d.bucket !== 'graded') continue;
    const { key } = groupKey(d, by);
    prevByKey.set(key, r2((prevByKey.get(key) ?? 0) + d.factoryKg));
  }
  return [...groups.values()]
    .filter((g) => g.rows.some((d) => d.bucket !== 'provisional'))
    .map(({ meta, rows }) => {
      const t = totalsOf(rows, tolerancePct, gradeFiltered);
      // a day has no "previous day" counterpart worth comparing
      const prev = by === 'day' ? 0 : (prevByKey.get(meta.key) ?? 0);
      return {
        ...t,
        key: meta.key,
        name: meta.name,
        routeName: meta.routeName,
        id: meta.id,
        prevFactoryKg: prev,
        changePct: by === 'day' ? null : changePct(t.factoryKg, prev),
      };
    })
    .sort((a, b) =>
      by === 'day'
        ? a.key.localeCompare(b.key)
        : b.factoryKg - a.factoryKg || a.name.localeCompare(b.name),
    );
}

/* ── Trend ── */

export interface TrendPoint {
  key: string;
  label: string;
  kg: number;
  deliveries: number;
  /** a month (or today) still in progress — drawn hollow, never read as complete */
  partial: boolean;
}

/** Ranges of more than 2 months trend by month; shorter ones by day. */
export function trendGranularity(r: DateRange): 'day' | 'month' {
  return daysBetween(r.from, r.to) > 62 ? 'month' : 'day';
}

/** The buckets of a range (every day / month in it, empty ones included), labelled with the year when it crosses years. */
export function trendBuckets(
  r: DateRange,
  by: 'day' | 'month',
): { key: string; label: string }[] {
  const crossesYear = r.from.slice(0, 4) !== r.to.slice(0, 4);
  const out: { key: string; label: string }[] = [];
  if (by === 'day') {
    for (let d = r.from; d <= r.to; d = addDays(d, 1)) {
      out.push({
        key: d,
        label: crossesYear ? `${dayMonth(d)} ${d.slice(0, 4)}` : dayMonth(d),
      });
    }
  } else {
    for (
      let m = monthOf(r.from);
      m <= monthOf(r.to);
      m = monthOf(shiftMonths(`${m}-01`, 1))
    ) {
      const [y, mm] = m.split('-').map(Number);
      out.push({
        key: m,
        label: crossesYear ? `${MONTHS[mm - 1]} ${y}` : MONTHS[mm - 1],
      });
    }
  }
  return out;
}

export function trendOf(
  facts: DeliveryFact[],
  r: DateRange,
  today: string,
): TrendPoint[] {
  const by = trendGranularity(r);
  const graded = facts.filter((d) => d.bucket === 'graded');
  return trendBuckets(r, by).map(({ key, label }) => {
    const rows = graded.filter((d) =>
      by === 'day' ? d.date === key : monthOf(d.date) === key,
    );
    const lastDay = by === 'day' ? key : monthRange(key).to;
    return {
      key,
      label,
      kg: r2(rows.reduce((s, d) => s + d.factoryKg, 0)),
      deliveries: rows.length,
      partial: lastDay >= today,
    };
  });
}

/** Super / Normal kg per month (the stacked bars, for ranges over 2 months). */
export function gradeByMonth(
  facts: DeliveryFact[],
  r: DateRange,
): { key: string; label: string; superKg: number; normalKg: number }[] {
  const graded = facts.filter((d) => d.bucket === 'graded');
  return trendBuckets(r, 'month').map(({ key, label }) => {
    const rows = graded.filter((d) => monthOf(d.date) === key);
    return {
      key,
      label,
      superKg: r2(rows.reduce((s, d) => s + d.superKg, 0)),
      normalKg: r2(rows.reduce((s, d) => s + d.normalKg, 0)),
    };
  });
}

/* ── The whole report ── */

export interface ActiveEstate {
  id: number;
  name: string;
  routeId: number | null;
  routeName: string | null;
  demo: boolean;
}

export interface CollectionReportInput {
  today: string;
  period: ResolvedPeriod;
  groupBy: GroupBy;
  filters: ReportFilters;
  tolerancePct: number;
  /** unfiltered deliveries of the period, the previous period and the same period last year */
  current: DeliveryFact[];
  previous: DeliveryFact[];
  lastYear: DeliveryFact[];
  activeEstates: ActiveEstate[];
  monthsWithData: string[];
}

const TOP_ESTATES = 10;

export function buildCollectionReport(i: CollectionReportInput) {
  const gradeFiltered = !!i.filters.grade;
  const cur = applyFilters(i.current, i.filters);
  const prev = applyFilters(i.previous, i.filters);
  const ly = applyFilters(i.lastYear, i.filters);
  const t = totalsOf(cur, i.tolerancePct, gradeFiltered);
  const tPrev = totalsOf(prev, i.tolerancePct, gradeFiltered);
  const tLy = totalsOf(ly, i.tolerancePct, gradeFiltered);

  // supplying estates: any delivery (graded or not) in the period, against the active estates in scope
  const inScope = i.activeEstates.filter(
    (e) =>
      (i.filters.includeDemo || !e.demo) &&
      (i.filters.routeId === undefined || e.routeId === i.filters.routeId) &&
      (i.filters.estateId === undefined || e.id === i.filters.estateId),
  );
  const supplied = new Set(
    cur
      .filter((d) => d.bucket === 'graded' || d.bucket === 'ungraded')
      .map((d) => d.estateId),
  );
  const notSupplying = inScope
    .filter((e) => !supplied.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, routeName: e.routeName }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const byRoute = groupRows(cur, [], 'route', i.tolerancePct, gradeFiltered)
    .filter((r) => r.factoryKg > 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      kg: r.factoryKg,
      deliveries: r.deliveries,
    }));
  const estates = groupRows(cur, prev, 'estate', i.tolerancePct, gradeFiltered);
  const granularity = trendGranularity(i.period);

  return {
    period: {
      from: i.period.from,
      to: i.period.to,
      kind: i.period.kind,
      month: i.period.month,
      label: i.period.label,
      partial: i.period.partial,
      previous: i.period.previous,
      lastYear: i.period.lastYear,
    },
    today: i.today,
    tolerancePct: i.tolerancePct,
    gradeFiltered,
    cards: {
      factoryKg: {
        value: t.factoryKg,
        previous: tPrev.factoryKg,
        changePct: changePct(t.factoryKg, tPrev.factoryKg),
        lastYear: tLy.deliveries > 0 ? tLy.factoryKg : null,
        yoyPct:
          tLy.deliveries > 0 ? changePct(t.factoryKg, tLy.factoryKg) : null,
      },
      deliveries: {
        value: t.deliveries,
        avgKg: t.deliveries > 0 ? r1(t.factoryKg / t.deliveries) : null,
        ungraded: t.ungradedDeliveries,
        ungradedEstateKg: t.ungradedEstateKg,
        provisional: t.provisional,
      },
      supplyingEstates: {
        value: inScope.length - notSupplying.length,
        of: inScope.length,
        notSupplying,
      },
      superShare: {
        value: t.superShare,
        previous: tPrev.superShare,
        // percentage points, not a % of a %
        changePts:
          t.superShare !== null && tPrev.superShare !== null
            ? r1(t.superShare - tPrev.superShare)
            : null,
      },
      weightDiff: {
        value: t.diffPct,
        estateKg: t.estateKg,
        factoryKg: t.factoryKg,
        overTolerance: cur
          .filter((d) => !gradeFiltered && overTolerance(d, i.tolerancePct))
          .map((d) => ({
            id: d.id,
            date: d.date,
            estateId: d.estateId,
            estateName: d.estateName,
            estateKg: d.estateKg,
            factoryKg: r2(d.factoryKg),
            diffPct: r1(((d.estateKg - d.factoryKg) / d.estateKg) * 100),
          }))
          .sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct)),
      },
    },
    trend: {
      granularity,
      points: trendOf(cur, i.period, i.today),
      // aligned by position with `points`: the same days / months a year earlier
      lastYear: trendOf(ly, i.period.lastYear, i.today).map((p) => ({
        key: p.key,
        kg: p.kg,
        deliveries: p.deliveries,
      })),
    },
    byRoute,
    topEstates: estates
      .filter((r) => r.factoryKg > 0)
      .slice(0, TOP_ESTATES)
      .map((r) => ({
        id: r.id,
        name: r.name,
        routeName: r.routeName,
        kg: r.factoryKg,
      })),
    gradeSplit: {
      superKg: t.superKg,
      normalKg: t.normalKg,
      superShare: t.superShare,
    },
    gradeByMonth: granularity === 'month' ? gradeByMonth(cur, i.period) : null,
    table: {
      groupBy: i.groupBy,
      rows:
        i.groupBy === 'estate'
          ? estates
          : groupRows(cur, prev, i.groupBy, i.tolerancePct, gradeFiltered),
      totals: {
        ...t,
        prevFactoryKg: tPrev.factoryKg,
        changePct: changePct(t.factoryKg, tPrev.factoryKg),
      },
    },
    monthsWithData: i.monthsWithData,
  };
}

export type CollectionReport = ReturnType<typeof buildCollectionReport>;
