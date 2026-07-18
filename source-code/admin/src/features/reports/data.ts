/* Aggregates for RPT-01/02/03 — mirrors what the other modules produce.
   Collection figures use CONFIRMED records only, so provisional entries
   never inflate the numbers (reports doc, RPT-01). */

export const COLLECTION_TREND = [
  { month: 'Feb', kg: 118400 },
  { month: 'Mar', kg: 124900 },
  { month: 'Apr', kg: 131200 },
  { month: 'May', kg: 127800 },
  { month: 'Jun', kg: 136500 },
  { month: 'Jul', kg: 142350 },
]

export const COLLECTION_BY_ESTATE = [
  { estate: 'Green Valley', kg: 12480 },
  { estate: 'Mount Rest', kg: 11020 },
  { estate: 'Hilltop', kg: 9310 },
  { estate: 'Silver Peak', kg: 4890 },
  { estate: 'Riverside', kg: 1560 },
]

/** July 2026: 142,350 kg — Super 58% / Normal 42% (doc example). */
export const GRADE_SPLIT = { superPct: 58, normalPct: 42 }

export const COLLECTION_ROWS = [
  { estate: 'Green Valley Estate', deliveries: 9, kg: 1780, superPct: 70 },
  { estate: 'Mount Rest Estate', deliveries: 8, kg: 1544, superPct: 53 },
  { estate: 'Hilltop Estate', deliveries: 7, kg: 1289, superPct: 30 },
  { estate: 'Silver Peak Estate', deliveries: 3, kg: 496, superPct: 100 },
]

export const REVENUE_TREND = [
  { month: 'Feb', revenue: 6812000 },
  { month: 'Mar', revenue: 7140000 },
  { month: 'Apr', revenue: 7563000 },
  { month: 'May', revenue: 7392000 },
  { month: 'Jun', revenue: 7921000 },
  { month: 'Jul', revenue: 8412000 },
]

export const REVENUE_BY_ESTATE = [
  { estate: 'Green Valley', revenue: 658900 },
  { estate: 'Mount Rest', revenue: 530200 },
  { estate: 'Hilltop', revenue: 448500 },
  { estate: 'Silver Peak', revenue: 184300 },
]

export const REVENUE_ROWS = [
  { estate: 'Green Valley Estate', superRs: 452000, normalRs: 206900, gross: 658900 },
  { estate: 'Mount Rest Estate', superRs: 297000, normalRs: 233200, gross: 530200 },
  { estate: 'Hilltop Estate', superRs: 134500, normalRs: 314000, gross: 448500 },
  { estate: 'Silver Peak Estate', superRs: 184300, normalRs: 0, gross: 184300 },
]

/** July 2026: Rs. 3,210,500 — Payroll 45% / Fertilizer 22% / Transport 18% / Other 15%. */
export const EXPENSE_SPLIT = [
  { category: 'Payroll', amount: 1444725 },
  { category: 'Fertilizer', amount: 706310 },
  { category: 'Transport', amount: 577890 },
  { category: 'Other', amount: 481575 },
]

export const EXPENSE_TREND = [
  { month: 'Feb', expenses: 2811000 },
  { month: 'Mar', expenses: 2904000 },
  { month: 'Apr', expenses: 3016000 },
  { month: 'May', expenses: 2958000 },
  { month: 'Jun', expenses: 3122000 },
  { month: 'Jul', expenses: 3210500 },
]

export type ExpenseCategory = 'Utilities' | 'Maintenance' | 'Miscellaneous' | 'Other'

export interface ExpenseEntry {
  id: string
  category: ExpenseCategory | 'Payroll' | 'Fertilizer' | 'Transport'
  description: string
  amount: number
  date: string
  enteredBy: string
  source: 'Manual' | 'Payroll run' | 'Settlement run'
}

export const EXPENSE_ROWS: ExpenseEntry[] = [
  { id: 'EXP-2026-0141', category: 'Payroll', description: 'July payroll run (EMP-12)', amount: 1444725, date: '2026-07-15', enteredBy: 'System', source: 'Payroll run' },
  { id: 'EXP-2026-0139', category: 'Fertilizer', description: 'Fertilizer deductions offset — July settlements', amount: 706310, date: '2026-07-14', enteredBy: 'System', source: 'Settlement run' },
  { id: 'EXP-2026-0138', category: 'Transport', description: 'Route transport costs — July settlements', amount: 577890, date: '2026-07-14', enteredBy: 'System', source: 'Settlement run' },
  { id: 'EXP-2026-0136', category: 'Utilities', description: 'CEB electricity — factory floor', amount: 214600, date: '2026-07-10', enteredBy: 'S. Fernando', source: 'Manual' },
  { id: 'EXP-2026-0133', category: 'Maintenance', description: 'Withering trough fan replacement', amount: 86500, date: '2026-07-07', enteredBy: 'S. Fernando', source: 'Manual' },
  { id: 'EXP-2026-0130', category: 'Miscellaneous', description: 'Factory floor cleaning supplies', amount: 12475, date: '2026-07-03', enteredBy: 'S. Fernando', source: 'Manual' },
]
