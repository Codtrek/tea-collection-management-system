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

export interface CollectionReport {
  period: string
  totalKg: number
  avgPerEstate: number
  topEstate: { estate: string; kg: number } | null
  gradeSplit: { superPct: number; normalPct: number }
  trend: TrendPoint[]
  byEstate: { estate: string; kg: number }[]
  rows: { estate: string; deliveries: number; kg: number; superPct: number }[]
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
