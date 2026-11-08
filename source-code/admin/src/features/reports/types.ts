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

export interface RevenueReport {
  period: string
  totalRevenue: number
  avgPerEstate: number
  prevRevenue: number | null
  deltaPercent: number | null
  trend: TrendPoint[]
  byEstate: { estate: string; revenue: number }[]
  rows: { estate: string; superRs: number; normalRs: number; gross: number }[]
}

export interface ExpenseRow {
  id: string
  category: ExpenseCategory | 'Payroll' | 'Fertilizer' | 'Transport'
  description: string
  amount: number
  date: string
  enteredBy: string
  source: 'Manual' | 'Payroll run' | 'Settlement run'
}

export interface ExpenseReport {
  period: string
  total: number
  manualTotal: number
  largest: { category: string; amount: number } | null
  deltaPercent: number | null
  split: { category: string; amount: number }[]
  trend: TrendPoint[]
  rows: ExpenseRow[]
  /** fertilizer written off in the period (kg) — information only, never part of total / split / trend */
  stockLost: { item: string; reason: string; kg: number }[]
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

/** The five seeded months (Mar–Jul 2026) — a fixed, known period list, same
    static-options precedent the old fixture used for its period Select. */
export const REPORT_PERIODS: { value: string; label: string }[] = [
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
]
