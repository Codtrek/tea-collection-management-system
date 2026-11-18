import { apiFetch } from '@/lib/api'
import type {
  CollectionReport,
  CollectionReportQuery,
  ExpenseCategory,
  ExpenseEntry,
  ExpenseReport,
  ExpenseReportQuery,
  LeafPurchaseQuery,
  LeafPurchaseReport,
  PaidVia,
} from '@/features/reports/types'

export interface CreateExpenseInput {
  categoryId: number
  amount: number
  date: string
  description: string
  paidVia: PaidVia
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {
  /** required outside the creator's edit window */
  reason?: string
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

/**
 * RPT-02 Leaf Purchase — what the factory owes and pays estate owners for green leaf, valued at the
 * grade rates in force on each delivery date. Same period and filter params as RPT-01.
 */
export function getLeafPurchaseReport(q: LeafPurchaseQuery = {}): Promise<LeafPurchaseReport> {
  const p = new URLSearchParams()
  if (q.thisMonth) p.set('thisMonth', '1')
  else if (q.from && q.to) {
    p.set('from', q.from)
    p.set('to', q.to)
  } else if (q.month) p.set('month', q.month)
  if (q.routeId !== undefined) p.set('routeId', String(q.routeId))
  if (q.estateId !== undefined) p.set('estateId', String(q.estateId))
  if (q.grade) p.set('grade', q.grade)
  if (q.includeDemo === false) p.set('demo', '0')
  if (q.groupBy) p.set('groupBy', q.groupBy)
  const qs = p.toString()
  return apiFetch<LeafPurchaseReport>(`/reports/leaf-purchases${qs ? `?${qs}` : ''}`)
}

/**
 * RPT-03 Expense report (Finance-Reports-Addendum) — leaf purchases, processed wages, fertilizer
 * stock and daily entries; recoveries, loans and estimated wages beside the total, never in it.
 * Same period params as RPT-01 (omitted → the last complete month).
 */
export function getExpenseReport(q: ExpenseReportQuery = {}): Promise<ExpenseReport> {
  const p = new URLSearchParams()
  if (q.thisMonth) p.set('thisMonth', '1')
  else if (q.from && q.to) {
    p.set('from', q.from)
    p.set('to', q.to)
  } else if (q.month) p.set('month', q.month)
  if (q.groupBy) p.set('groupBy', q.groupBy)
  if (q.category) p.set('category', q.category)
  const qs = p.toString()
  return apiFetch<ExpenseReport>(`/reports/expenses${qs ? `?${qs}` : ''}`)
}

/* ── RPT-04 daily expense entries (Finance-Reports-Addendum §6–7) ── */

/** The category list, inactive ones included (they stay on old entries). */
export function listExpenseCategories(): Promise<ExpenseCategory[]> {
  return apiFetch<ExpenseCategory[]>('/reports/expense-categories')
}

/** ADM-01 — Administrator. Returns the updated list. */
export function createExpenseCategory(name: string): Promise<ExpenseCategory[]> {
  return apiFetch<ExpenseCategory[]>('/reports/expense-categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function updateExpenseCategory(
  id: number,
  patch: Partial<Pick<ExpenseCategory, 'name' | 'active' | 'sortOrder'>>,
): Promise<ExpenseCategory[]> {
  return apiFetch<ExpenseCategory[]>(`/reports/expense-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function getExpense(id: string): Promise<ExpenseEntry> {
  return apiFetch<ExpenseEntry>(`/reports/expenses/${encodeURIComponent(id)}`)
}

/** Log a daily expense — `expenses: edit`. */
export function createExpense(input: CreateExpenseInput): Promise<ExpenseEntry> {
  return apiFetch<ExpenseEntry>('/reports/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Change an entry: the creator within the window, else the Manager with a reason. */
export function updateExpense(id: string, input: UpdateExpenseInput): Promise<ExpenseEntry> {
  return apiFetch<ExpenseEntry>(`/reports/expenses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
