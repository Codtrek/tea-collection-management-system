import { apiFetch } from '@/lib/api'
import type {
  CollectionReport,
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

/** RPT-01. Confirmed collection records only. Omit `period` for the latest month with data. */
export function getCollectionReport(period?: string): Promise<CollectionReport> {
  return apiFetch<CollectionReport>(withPeriod('/reports/collection', period))
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
