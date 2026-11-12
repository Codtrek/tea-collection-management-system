/*
  RPT-01..04 contract — byte-identical to the backend's `reports-map.ts`
  Public* shapes. Kept here (not in `services/reports.ts`) per the module
  recipe: delete the fixture, keep the types.
*/

export type ExpenseCategory = 'Utilities' | 'Maintenance' | 'Miscellaneous' | 'Other'

export interface TrendPoint {
  month: string
  value: number
  // Chart components accept a generic { [key: string]: string | number } tick.
  [key: string]: string | number
}

/* ── RPT-01 Collection (backend `collection-report-rules.ts`, Reports-Collection-Addendum) ── */

export type CollectionGroupBy = 'estate' | 'route' | 'agent' | 'day'
export type ReportGrade = 'super' | 'normal'

export interface DateRange {
  from: string
  to: string
}

/** The figures of a group of deliveries — a table row, or the totals row. */
export interface CollectionTotals {
  /** graded deliveries */
  deliveries: number
  /** estate weight of the graded deliveries; null under a grade filter */
  estateKg: number | null
  /** Σ grade lines — the figure the report is about */
  factoryKg: number
  /** (estate − factory) ÷ estate, %; null under a grade filter */
  diffPct: number | null
  overTolerance: number
  superKg: number
  normalKg: number
  superShare: number | null
  ungradedDeliveries: number
  ungradedEstateKg: number
  provisional: number
  prevFactoryKg: number
  changePct: number | null
}

export interface CollectionGroupRow extends CollectionTotals {
  key: string
  name: string
  routeName: string | null
  id: number | null
}

export interface CollectionTrendPoint {
  key: string
  label: string
  kg: number
  deliveries: number
  partial: boolean
}

export interface CollectionReport {
  period: {
    from: string
    to: string
    kind: 'month' | 'custom' | 'thisMonth'
    month: string | null
    label: string
    partial: boolean
    previous: DateRange
    lastYear: DateRange
  }
  today: string
  tolerancePct: number
  gradeFiltered: boolean
  cards: {
    factoryKg: { value: number; previous: number; changePct: number | null; lastYear: number | null; yoyPct: number | null }
    deliveries: { value: number; avgKg: number | null; ungraded: number; ungradedEstateKg: number; provisional: number }
    supplyingEstates: { value: number; of: number; notSupplying: { id: number; name: string; routeName: string | null }[] }
    superShare: { value: number | null; previous: number | null; changePts: number | null }
    weightDiff: {
      value: number | null
      estateKg: number | null
      factoryKg: number
      overTolerance: { id: string; date: string; estateId: number | null; estateName: string; estateKg: number; factoryKg: number; diffPct: number }[]
    }
  }
  trend: {
    granularity: 'day' | 'month'
    points: CollectionTrendPoint[]
    lastYear: { key: string; kg: number; deliveries: number }[]
  }
  byRoute: { id: number | null; name: string; kg: number; deliveries: number }[]
  topEstates: { id: number | null; name: string; routeName: string | null; kg: number }[]
  gradeSplit: { superKg: number; normalKg: number; superShare: number | null }
  gradeByMonth: { key: string; label: string; superKg: number; normalKg: number }[] | null
  table: { groupBy: CollectionGroupBy; rows: CollectionGroupRow[]; totals: CollectionTotals }
  /** months with delivered leaf, newest first */
  monthsWithData: string[]
  /** the filter pickers' choices (independent of the filters) */
  options: {
    routes: { id: number; name: string }[]
    agents: { id: number; name: string }[]
    estates: { id: number; name: string; routeName: string | null; demo: boolean }[]
  }
}

/** What the page asks for — mirrors `GET /reports/collection`'s query (all of it lives in the page URL too). */
export interface CollectionReportQuery {
  month?: string
  from?: string
  to?: string
  thisMonth?: boolean
  routeId?: number
  agentId?: number
  estateId?: number
  grade?: ReportGrade
  /** false hides the demo seed's rows */
  includeDemo?: boolean
  groupBy?: CollectionGroupBy
}

/* ── RPT-02 Leaf Purchase (backend `leaf-purchase-rules.ts`, Reports addendum §9) ── */

export type LeafGroupBy = 'estate' | 'route' | 'month'

export interface LeafTotals {
  /** priced graded deliveries */
  deliveries: number
  /** factory kg of the priced deliveries — the divisor of every Rs/kg */
  factoryKg: number
  superKg: number
  normalKg: number
  valueRs: number
  superRs: number
  normalRs: number
  rsPerKg: number | null
  superRsPerKg: number | null
  normalRsPerKg: number | null
  settledRs: number
  unsettledRs: number
  noRateDeliveries: number
  noRateKg: number
  prevValueRs: number
  changePct: number | null
}

export interface LeafGroupRow extends LeafTotals {
  key: string
  name: string
  routeName: string | null
  id: number | null
}

export interface LeafTrendPoint {
  key: string
  label: string
  valueRs: number
  factoryKg: number
  rsPerKg: number | null
  partial: boolean
}

export interface LeafPurchaseReport {
  period: CollectionReport['period']
  today: string
  gradeFiltered: boolean
  cards: {
    leafValue: { value: number; previous: number; changePct: number | null; lastYear: number | null; yoyPct: number | null }
    pricePerKg: { value: number | null; superRsPerKg: number | null; normalRsPerKg: number | null; previous: number | null; changePct: number | null }
    settlement: { settledRs: number; unsettledRs: number; valueRs: number }
    /** processed settlements of the period: what was actually paid (snapshot rates) */
    payments: {
      count: number
      grossRs: number
      transportRs: number
      fertilizerRs: number
      advancesRs: number
      adjustmentRs: number
      netRs: number
      /** false while settlements aren't linked to deliveries (no generator yet) */
      linked: boolean
    }
    noRate: { deliveries: number; kg: number }
  }
  /** always monthly; a single month shows the 12 months ending with it */
  trend: LeafTrendPoint[]
  byGrade: { superRs: number; normalRs: number; superKg: number; normalKg: number }
  gradeByMonth: { key: string; label: string; superRs: number; normalRs: number }[] | null
  byRoute: { id: number | null; name: string; valueRs: number; factoryKg: number }[]
  topEstates: { id: number | null; name: string; routeName: string | null; valueRs: number }[]
  table: { groupBy: LeafGroupBy; rows: LeafGroupRow[]; totals: LeafTotals }
  monthsWithData: string[]
  options: {
    routes: { id: number; name: string }[]
    estates: { id: number; name: string; routeName: string | null; demo: boolean }[]
  }
}

export interface LeafPurchaseQuery extends Omit<CollectionReportQuery, 'groupBy' | 'agentId'> {
  groupBy?: LeafGroupBy
}

/* ── RPT-03 Expense report (Finance-Reports-Addendum) — mirrors backend finance-rules.ts ── */

export type ExpenseKind = 'leaf' | 'wages' | 'stock' | 'operating'
export type ExpenseSource = 'Leaf' | 'Payroll' | 'Stock' | 'Manual'
export type ExpenseGroupBy = 'category' | 'month' | 'entry'

export interface ExpenseTableRow {
  key: string
  name: string
  date: string | null
  category: string | null
  kind: ExpenseKind | null
  description: string | null
  source: ExpenseSource | null
  href: string | null
  enteredBy: string | null
  paidVia: 'cash' | 'bank' | null
  records: number
  amount: number
  pct: number | null
}

export interface ExpenseTrendPoint {
  key: string
  label: string
  leaf: number
  wages: number
  stock: number
  operating: number
  total: number
  partial: boolean
}

export interface ExpenseRecoveries {
  settlements: number
  transportRs: number
  fertilizerRs: number
  advancesRs: number
  totalRs: number
}

export interface ExpenseReport {
  period: Omit<CollectionReport['period'], 'previous' | 'lastYear'>
  filters: { category: string | null }
  cards: {
    total: { value: number; previous: number | null; changePct: number | null; lastYear: number | null; yoyPct: number | null }
    largest: { category: string; amount: number; pct: number } | null
    leafShare: { amount: number; pct: number | null }
    recovered: ExpenseRecoveries
  }
  byCategory: { category: string; kind: ExpenseKind; amount: number; pct: number | null }[]
  trend: ExpenseTrendPoint[]
  table: { groupBy: ExpenseGroupBy; rows: ExpenseTableRow[]; totals: { records: number; amount: number } }
  /** leaf purchases − transport charges recovered */
  netLeafCostRs: number
  /** attendance × pay rates for months whose payroll isn't processed — never in the total */
  wagesEstimate: { amountRs: number; months: { month: string; amountRs: number; employees: number; days: number }[] }
  /** advances issued — cash out, not an expense */
  loans: { totalRs: number; estateRs: number; salaryRs: number; count: number }
  stock: { uncosted: number; uncostedKg: number }
  /** fertilizer written off in the period (kg) — information only, never an expense */
  stockLost: { item: string; reason: string; kg: number }[]
  empty: { reason: string | null; hints: string[] }
  options: { categories: string[] }
}

export interface ExpenseReportQuery {
  month?: string
  from?: string
  to?: string
  thisMonth?: boolean
  groupBy?: ExpenseGroupBy
  category?: string
}

export interface ExpenseEntry {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  enteredBy: string
  source: 'Manual'
}

