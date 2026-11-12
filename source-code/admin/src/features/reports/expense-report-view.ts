import { toCsv } from '@/lib/csv'
import type { ExpenseGroupBy, ExpenseReport, ExpenseReportQuery, ExpenseTableRow } from './types'

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

/* ── Export (CSV, opens in Excel) ── */

const GROUP_NAME: Record<ExpenseGroupBy, string> = { category: 'Category', month: 'Month', entry: 'Entry' }
const n2 = (v: number | null) => (v === null ? '' : v.toFixed(2))
const n1 = (v: number | null) => (v === null ? '' : v.toFixed(1))
const quote = (line: string) => (/[",]/.test(line) ? `"${line.replace(/"/g, '""')}"` : line)

/**
 * The table exactly as the server computed it — every row of the current grouping and the totals
 * row — with a short preamble saying what is and isn't counted. Plain numbers (Rs with 2 decimals)
 * so Excel can sum them.
 */
export function expenseCsv(report: ExpenseReport): string {
  const by = report.table.groupBy
  const columns =
    by === 'entry'
      ? [
          { header: 'Date', value: (r: ExpenseTableRow) => r.date ?? '' },
          { header: 'Category', value: (r: ExpenseTableRow) => r.category ?? '' },
          { header: 'Description', value: (r: ExpenseTableRow) => r.description ?? '' },
          { header: 'Source', value: (r: ExpenseTableRow) => r.source ?? '' },
          { header: 'Reference', value: (r: ExpenseTableRow) => (r.key === 'total' ? '' : r.key) },
          { header: 'Paid via', value: (r: ExpenseTableRow) => r.paidVia ?? '' },
          { header: 'Records', value: (r: ExpenseTableRow) => r.records },
          { header: 'Amount Rs', value: (r: ExpenseTableRow) => n2(r.amount) },
          { header: '% of total', value: (r: ExpenseTableRow) => n1(r.pct) },
        ]
      : [
          { header: GROUP_NAME[by], value: (r: ExpenseTableRow) => r.name },
          ...(by === 'category' ? [{ header: 'Source', value: (r: ExpenseTableRow) => r.source ?? '' }] : []),
          { header: 'Records', value: (r: ExpenseTableRow) => r.records },
          { header: 'Amount Rs', value: (r: ExpenseTableRow) => n2(r.amount) },
          { header: '% of total', value: (r: ExpenseTableRow) => n1(r.pct) },
        ]
  const totals: ExpenseTableRow = {
    key: 'total',
    name: 'Total',
    date: by === 'entry' ? 'Total' : null,
    category: null,
    kind: null,
    description: null,
    source: null,
    href: null,
    enteredBy: null,
    paidVia: null,
    records: report.table.totals.records,
    amount: report.table.totals.amount,
    pct: report.table.totals.amount > 0 ? 100 : null,
  }
  const rec = report.cards.recovered
  const preamble = [
    'Expense Report',
    `Period: ${report.period.label}${report.period.partial ? ' (in progress)' : ''}`,
    `Filters: ${report.filters.category ? `Category: ${report.filters.category}` : 'No filters'}`,
    'Counted: green leaf purchases (at the grade rate in force), processed wages, fertilizer stock bought, daily expense entries',
    `Not counted: recovered from estate owners Rs ${rec.totalRs.toFixed(2)}; loans issued Rs ${report.loans.totalRs.toFixed(2)}; estimated wages not yet processed Rs ${report.wagesEstimate.amountRs.toFixed(2)}`,
    '',
  ].map(quote)
  return [...preamble, toCsv(columns, [...report.table.rows, totals])].join('\r\n')
}

/** "expenses-2026-10-category.csv" */
export function expenseCsvName(report: ExpenseReport): string {
  const period = report.period.month ?? `${report.period.from}_${report.period.to}`
  return `expenses-${period}-${report.table.groupBy}.csv`
}
