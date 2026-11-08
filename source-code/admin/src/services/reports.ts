import { apiFetch } from '@/lib/api'
import type {
  CollectionReport,
  CollectionReportQuery,
  ExpenseCategory,
  ExpenseEntry,
  ExpenseReport,
  RevenueReport,
} from '@/features/reports/types'

export interface CreateExpenseInput {
  category: ExpenseCategory
  amount: number
  date: string
  description: string
}

function withPeriod(path: string, period?: string): string {
  return period ? `${path}?period=${period}` : path
}

/**
 * RPT-01 — every figure (cards, charts, table, totals, export) comes from this one response.
 * No period → the last complete month.
 */
export function getCollectionReport(q: CollectionReportQuery = {}): Promise<CollectionReport> {
  const p = new URLSearchParams()
  if (q.thisMonth) p.set('thisMonth', '1')
  else if (q.from && q.to) {
    p.set('from', q.from)
    p.set('to', q.to)
  } else if (q.month) p.set('month', q.month)
  if (q.routeId !== undefined) p.set('routeId', String(q.routeId))
  if (q.agentId !== undefined) p.set('agentId', String(q.agentId))
  if (q.estateId !== undefined) p.set('estateId', String(q.estateId))
  if (q.grade) p.set('grade', q.grade)
  if (q.includeDemo === false) p.set('demo', '0')
  if (q.groupBy) p.set('groupBy', q.groupBy)
  const qs = p.toString()
  return apiFetch<CollectionReport>(`/reports/collection${qs ? `?${qs}` : ''}`)
}

/** RPT-02. Processed settlements only — a pending settlement isn't realized revenue yet. */
export function getRevenueReport(period?: string): Promise<RevenueReport> {
  return apiFetch<RevenueReport>(withPeriod('/reports/revenue', period))
}

/** RPT-03. Payroll + settlement transport/fertilizer + manual entries. */
export function getExpenseReport(period?: string): Promise<ExpenseReport> {
  return apiFetch<ExpenseReport>(withPeriod('/reports/expenses', period))
}

/** RPT-04 — log a manual daily expense. Officer+ (Manager read-only). */
export function createExpense(input: CreateExpenseInput): Promise<ExpenseEntry> {
  return apiFetch<ExpenseEntry>('/reports/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
