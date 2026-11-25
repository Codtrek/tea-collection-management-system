/*
  RPT-02 Leaf Purchase Report — the rules (docs/specs/Reports-Collection-Addendum.md §9). What the
  factory owes and pays estate owners for green leaf. Pure functions: every number on the page, its
  totals, the CSV export and the Expense report's "Green leaf purchases" line come from here.

  Deliveries follow the Collection report's rules (collection-report-rules.ts): graded only (the
  current grade lines = the latest approved revision), provisional and not-delivered excluded,
  Colombo calendar days. Each graded delivery is valued at the grade rate IN FORCE ON ITS DATE
  (rateVersionFor) — a later rate change never alters it.
*/
import { rateVersionFor } from '../estates/settlement-calc';
import {
  applyFilters,
  changePct,
  monthLabel,
  monthOf,
  monthRange,
  shiftMonths,
  trendBuckets,
  trendGranularity,
  type DateRange,
  type DeliveryFact,
  type ReportFilters,
  type ResolvedPeriod,
} from './collection-report-rules';

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface RateVersion {
  effectiveDate: string;
  superRate: number;
  normalRate: number;
}

/** A graded delivery with its value. `valueRs` is null when no rate version was in force on its date. */
export interface ValuedDelivery extends DeliveryFact {
  superRs: number;
  normalRs: number;
  valueRs: number | null;
  /** taken by a PROCESSED settlement */
  settled: boolean;
}

/**
 * Values the graded deliveries (filters already applied, so a grade filter values only that grade).
 * Ungraded, provisional and not-delivered entries carry no value and are dropped here.
 */
export function valueDeliveries(
  facts: DeliveryFact[],
  rates: RateVersion[],
  processedSettlementIds: ReadonlySet<string>,
): ValuedDelivery[] {
  return facts
    .filter((d) => d.bucket === 'graded')
    .map((d) => {
      const v = rateVersionFor(rates, d.date);
      const superRs = v ? r2(d.superKg * v.superRate) : 0;
      const normalRs = v ? r2(d.normalKg * v.normalRate) : 0;
      return {
        ...d,
        superRs,
        normalRs,
        valueRs: v ? r2(superRs + normalRs) : null,
        settled: !!d.settlementId && processedSettlementIds.has(d.settlementId),
      };
    });
}

export interface LeafTotals {
  /** priced graded deliveries */
  deliveries: number;
  /** factory kg of the priced deliveries — the divisor of every Rs/kg */
  factoryKg: number;
  superKg: number;
  normalKg: number;
  valueRs: number;
  superRs: number;
  normalRs: number;
  /** value ÷ factory kg */
  rsPerKg: number | null;
  superRsPerKg: number | null;
  normalRsPerKg: number | null;
  settledRs: number;
  /** valueRs − settledRs, so settled + not yet settled = accrued */
  unsettledRs: number;
  /** graded deliveries with no grade rate in force on their date: counted, never valued */
  noRateDeliveries: number;
  noRateKg: number;
}

export function leafTotals(rows: ValuedDelivery[]): LeafTotals {
  const priced = rows.filter((d) => d.valueRs !== null);
  const noRate = rows.filter((d) => d.valueRs === null);
  const sum = (
    list: ValuedDelivery[],
    k: 'factoryKg' | 'superKg' | 'normalKg' | 'superRs' | 'normalRs',
  ) => r2(list.reduce((s, d) => s + d[k], 0));
  const valueRs = r2(priced.reduce((s, d) => s + (d.valueRs ?? 0), 0));
  const settledRs = r2(
    priced.filter((d) => d.settled).reduce((s, d) => s + (d.valueRs ?? 0), 0),
  );
  const factoryKg = sum(priced, 'factoryKg');
  const superKg = sum(priced, 'superKg');
  const normalKg = sum(priced, 'normalKg');
  const superRs = sum(priced, 'superRs');
  const normalRs = sum(priced, 'normalRs');
  const per = (rs: number, kg: number) => (kg > 0 ? r2(rs / kg) : null);
  return {
    deliveries: priced.length,
    factoryKg,
    superKg,
    normalKg,
    valueRs,
    superRs,
    normalRs,
    rsPerKg: per(valueRs, factoryKg),
    superRsPerKg: per(superRs, superKg),
    normalRsPerKg: per(normalRs, normalKg),
    settledRs,
    unsettledRs: r2(valueRs - settledRs),
    noRateDeliveries: noRate.length,
    noRateKg: sum(noRate, 'factoryKg'),
  };
}

/* ── Table ── */

export type LeafGroupBy = 'estate' | 'route' | 'month';

export interface LeafGroupRow extends LeafTotals {
  key: string;
  name: string;
  routeName: string | null;
  /** estate / route id to link with; null for a month */
  id: number | null;
  prevValueRs: number;
  changePct: number | null;
}

function leafKey(d: DeliveryFact, by: LeafGroupBy) {
  if (by === 'route')
    return {
      key: `r${d.routeId ?? d.routeName}`,
      name: d.routeName,
      id: d.routeId,
      routeName: null,
    };
  if (by === 'month') {
    const m = monthOf(d.date);
    return { key: m, name: monthLabel(m), id: null, routeName: null };
  }
  return {
    key: `e${d.estateId ?? d.estateName}`,
    name: d.estateName,
    id: d.estateId,
    routeName: d.routeName,
  };
}

/** One row per estate / route / month with valued deliveries, largest value first (months in order). */
export function leafGroupRows(
  rows: ValuedDelivery[],
  prev: ValuedDelivery[],
  by: LeafGroupBy,
): LeafGroupRow[] {
  const groups = new Map<
    string,
    { meta: ReturnType<typeof leafKey>; rows: ValuedDelivery[] }
  >();
  for (const d of rows) {
    const meta = leafKey(d, by);
    const g = groups.get(meta.key) ?? { meta, rows: [] };
    g.rows.push(d);
    groups.set(meta.key, g);
  }
  const prevByKey = new Map<string, number>();
  for (const d of prev) {
    if (d.valueRs === null) continue;
    const { key } = leafKey(d, by);
    prevByKey.set(key, r2((prevByKey.get(key) ?? 0) + d.valueRs));
  }
  return [...groups.values()]
    .map(({ meta, rows: list }) => {
      const t = leafTotals(list);
      // a month row has no "previous" counterpart within the same table
      const prevValue = by === 'month' ? 0 : (prevByKey.get(meta.key) ?? 0);
      return {
        ...t,
        ...meta,
        prevValueRs: prevValue,
        changePct: by === 'month' ? null : changePct(t.valueRs, prevValue),
      };
    })
    .sort((a, b) =>
      by === 'month'
        ? a.key.localeCompare(b.key)
        : b.valueRs - a.valueRs || a.name.localeCompare(b.name),
    );
}

/* ── Trend (always monthly) ── */

/**
 * The months the trend covers: the period's own months when it spans more than 2 months, otherwise
 * the 12 months ending with it — a single month needs its context to be read.
 */
export function leafTrendRange(period: DateRange): DateRange {
  if (trendGranularity(period) === 'month') return period;
  const lastMonth = monthOf(period.to);
  return {
    from: `${monthOf(shiftMonths(`${lastMonth}-01`, -11))}-01`,
    to: period.to,
  };
}

export interface LeafTrendPoint {
  key: string;
  label: string;
  valueRs: number;
  factoryKg: number;
  rsPerKg: number | null;
  /** a month still in progress — drawn dashed, never read as complete */
  partial: boolean;
}

export function leafTrend(
  rows: ValuedDelivery[],
  range: DateRange,
  today: string,
): LeafTrendPoint[] {
  return trendBuckets(range, 'month').map(({ key, label }) => {
    const t = leafTotals(rows.filter((d) => monthOf(d.date) === key));
    return {
      key,
      label,
      valueRs: t.valueRs,
      factoryKg: t.factoryKg,
      rsPerKg: t.rsPerKg,
      partial: monthRange(key).to >= today,
    };
  });
}

/* ── Settlements recorded in the period (card 4) ── */

export interface SettlementInput {
  id: string;
  /** 'YYYY-MM' of the settlement's period */
  month: string;
  status: string;
  superKg: number;
  normalKg: number;
  superRate: number;
  normalRate: number;
  transportCost: number;
  fertilizerDeduction: number;
  advanceDeduction: number;
  adjustmentAmount: number;
  /** a generated settlement's priced gross (rate periods); null on seeded rows = kg × rate */
  grossAmount?: number | null;
}

/**
 * The processed settlements whose period falls in the range: what was actually paid, with its
 * deductions. Gross uses each settlement's own snapshot rates — the amount on the payment, not a
 * revaluation. `linked` says whether those settlements took any of the range's deliveries (no
 * settlement generator exists yet, so seeded settlements aren't linked).
 */
export function settledPayments(
  settlements: SettlementInput[],
  range: DateRange,
  linkedIds: ReadonlySet<string>,
) {
  const months = { from: monthOf(range.from), to: monthOf(range.to) };
  const list = settlements.filter(
    (s) =>
      s.status === 'processed' &&
      s.month >= months.from &&
      s.month <= months.to,
  );
  const sum = (f: (s: SettlementInput) => number) =>
    r2(list.reduce((acc, s) => acc + f(s), 0));
  const grossRs = sum(
    (s) => s.grossAmount ?? s.superKg * s.superRate + s.normalKg * s.normalRate,
  );
  const transportRs = sum((s) => s.transportCost);
  const fertilizerRs = sum((s) => s.fertilizerDeduction);
  const advancesRs = sum((s) => s.advanceDeduction);
  const adjustmentRs = sum((s) => s.adjustmentAmount);
  return {
    count: list.length,
    grossRs,
    transportRs,
    fertilizerRs,
    advancesRs,
    adjustmentRs,
    // the settlement rule (estate-map netPayable): gross − deductions + adjustment
    netRs: r2(grossRs - transportRs - fertilizerRs - advancesRs + adjustmentRs),
    linked: list.length > 0 && list.every((s) => linkedIds.has(s.id)),
  };
}

/* ── The whole report ── */

export interface LeafReportInput {
  today: string;
  period: ResolvedPeriod;
  groupBy: LeafGroupBy;
  filters: ReportFilters;
  rates: RateVersion[];
  processedSettlementIds: ReadonlySet<string>;
  settlements: SettlementInput[];
  /** unfiltered deliveries of the period, the previous period, the same period last year and the trend range */
  current: DeliveryFact[];
  previous: DeliveryFact[];
  lastYear: DeliveryFact[];
  trend: DeliveryFact[];
  monthsWithData: string[];
  options: {
    routes: { id: number; name: string }[];
    estates: {
      id: number;
      name: string;
      routeName: string | null;
      demo: boolean;
    }[];
  };
}

const TOP_ESTATES = 10;

export function buildLeafPurchaseReport(i: LeafReportInput) {
  const value = (facts: DeliveryFact[]) =>
    valueDeliveries(
      applyFilters(facts, i.filters),
      i.rates,
      i.processedSettlementIds,
    );
  const cur = value(i.current);
  const prev = value(i.previous);
  const ly = value(i.lastYear);
  const t = leafTotals(cur);
  const tPrev = leafTotals(prev);
  const tLy = leafTotals(ly);
  const trendRange = leafTrendRange(i.period);
  const linked = new Set(
    cur.map((d) => d.settlementId).filter((x): x is string => !!x),
  );
  const estates = leafGroupRows(cur, prev, 'estate');

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
    gradeFiltered: !!i.filters.grade,
    cards: {
      leafValue: {
        value: t.valueRs,
        previous: tPrev.valueRs,
        changePct: changePct(t.valueRs, tPrev.valueRs),
        lastYear: tLy.deliveries > 0 ? tLy.valueRs : null,
        yoyPct: tLy.deliveries > 0 ? changePct(t.valueRs, tLy.valueRs) : null,
      },
      pricePerKg: {
        value: t.rsPerKg,
        superRsPerKg: t.superRsPerKg,
        normalRsPerKg: t.normalRsPerKg,
        previous: tPrev.rsPerKg,
        changePct:
          t.rsPerKg !== null && tPrev.rsPerKg !== null
            ? changePct(t.rsPerKg, tPrev.rsPerKg)
            : null,
      },
      settlement: {
        settledRs: t.settledRs,
        unsettledRs: t.unsettledRs,
        valueRs: t.valueRs,
      },
      payments: settledPayments(i.settlements, i.period, linked),
      noRate: { deliveries: t.noRateDeliveries, kg: t.noRateKg },
    },
    trend: leafTrend(value(i.trend), trendRange, i.today),
    byGrade: {
      superRs: t.superRs,
      normalRs: t.normalRs,
      superKg: t.superKg,
      normalKg: t.normalKg,
    },
    gradeByMonth:
      trendGranularity(i.period) === 'month'
        ? trendBuckets(i.period, 'month').map(({ key, label }) => {
            const m = leafTotals(cur.filter((d) => monthOf(d.date) === key));
            return { key, label, superRs: m.superRs, normalRs: m.normalRs };
          })
        : null,
    byRoute: leafGroupRows(cur, [], 'route')
      .filter((r) => r.valueRs > 0)
      .map((r) => ({
        id: r.id,
        name: r.name,
        valueRs: r.valueRs,
        factoryKg: r.factoryKg,
      })),
    topEstates: estates
      .filter((r) => r.valueRs > 0)
      .slice(0, TOP_ESTATES)
      .map((r) => ({
        id: r.id,
        name: r.name,
        routeName: r.routeName,
        valueRs: r.valueRs,
      })),
    table: {
      groupBy: i.groupBy,
      rows:
        i.groupBy === 'estate' ? estates : leafGroupRows(cur, prev, i.groupBy),
      totals: {
        ...t,
        prevValueRs: tPrev.valueRs,
        changePct: changePct(t.valueRs, tPrev.valueRs),
      },
    },
    monthsWithData: i.monthsWithData,
    options: i.options,
  };
}

export type LeafPurchaseReport = ReturnType<typeof buildLeafPurchaseReport>;

/** Accrued leaf value per month — the Expense report's "Green leaf purchases" line uses exactly this. */
export function leafValueByMonth(
  facts: DeliveryFact[],
  rates: RateVersion[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const d of valueDeliveries(facts, rates, new Set())) {
    if (d.valueRs === null) continue;
    const m = monthOf(d.date);
    out.set(m, r2((out.get(m) ?? 0) + d.valueRs));
  }
  return out;
}
