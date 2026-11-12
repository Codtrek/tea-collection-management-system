import type { ExpenseGroupBy, ExpenseReportQuery } from './types'

/*
  RPT-03's view state lives in the URL, so a link reproduces exactly what was on screen:
  ?month= | ?from=&to= | ?thisMonth=1, plus category and group. Defaults (the last complete month,
  grouped by category) stay out of the URL. Pure — unit-tested in expense-report-view.test.ts.
*/

export interface ExpenseView extends ExpenseReportQuery {
  groupBy: ExpenseGroupBy
}

const GROUPS: ExpenseGroupBy[] = ['category', 'month', 'entry']
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isMonth = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

export function readExpenseView(p: URLSearchParams): ExpenseView {
  const group = p.get('group') as ExpenseGroupBy | null
  const from = p.get('from')
  const to = p.get('to')
  const category = p.get('category')?.trim()
  const view: ExpenseView = {
    groupBy: group && GROUPS.includes(group) ? group : 'category',
    category: category || undefined,
  }
  if (p.get('thisMonth') === '1') view.thisMonth = true
  else if (isDate(from) && isDate(to) && from <= to) Object.assign(view, { from, to })
  else if (isMonth(p.get('month'))) view.month = p.get('month')!
  return view
}

export function expenseViewParams(v: ExpenseView): URLSearchParams {
  const p = new URLSearchParams()
  if (v.thisMonth) p.set('thisMonth', '1')
  else if (v.from && v.to) {
    p.set('from', v.from)
    p.set('to', v.to)
  } else if (v.month) p.set('month', v.month)
  if (v.category) p.set('category', v.category)
  if (v.groupBy !== 'category') p.set('group', v.groupBy)
  return p
}

export function expenseQuery(v: ExpenseView): ExpenseReportQuery {
  return { month: v.month, from: v.from, to: v.to, thisMonth: v.thisMonth, category: v.category, groupBy: v.groupBy }
}

/** The four kinds of expense, in stacking order, with their source and colour slot. */
export const EXPENSE_KINDS = [
  { key: 'leaf', name: 'Green leaf purchases' },
  { key: 'wages', name: 'Wages' },
  { key: 'stock', name: 'Fertilizer stock' },
  { key: 'operating', name: 'Operating costs' },
] as const
