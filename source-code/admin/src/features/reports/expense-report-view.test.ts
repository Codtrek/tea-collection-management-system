import { describe, expect, it } from 'vitest'
import { expenseCsv, expenseCsvName, expenseQuery, expenseViewParams, readExpenseView } from './expense-report-view'
import type { ExpenseReport, ExpenseTableRow } from './types'

describe('RPT-03 view state lives in the URL', () => {
  it('round-trips every filter, so a link reproduces the view', () => {
    const qs = 'from=2026-05-01&to=2026-10-31&category=Electricity&group=entry'
    const v = readExpenseView(new URLSearchParams(qs))
    expect(v).toMatchObject({ from: '2026-05-01', to: '2026-10-31', category: 'Electricity', groupBy: 'entry' })
    expect(expenseViewParams(v).toString()).toBe(qs)
  })

  it('keeps defaults out of the URL: the last complete month, grouped by category', () => {
    const v = readExpenseView(new URLSearchParams())
    expect(v.groupBy).toBe('category')
    expect(v.month ?? v.from ?? v.thisMonth ?? v.category).toBeUndefined()
    expect(expenseViewParams(v).toString()).toBe('')
    // no period sent → the server picks the last complete month (never "latest with data")
    expect(expenseQuery(v)).toMatchObject({ month: undefined, from: undefined, thisMonth: undefined })
  })

  it('this month so far wins over a stale month; bad values are ignored', () => {
    const v = readExpenseView(new URLSearchParams('thisMonth=1&month=2026-03'))
    expect(v.thisMonth).toBe(true)
    expect(v.month).toBeUndefined()
    const bad = readExpenseView(new URLSearchParams('month=2026-13&from=2026-10-31&to=2026-10-01&group=estate'))
    expect([bad.month, bad.from, bad.groupBy]).toEqual([undefined, undefined, 'category'])
  })
})

describe('export', () => {
  const row = (o: Partial<ExpenseTableRow>): ExpenseTableRow => ({
    key: 'x',
    name: 'x',
    date: null,
    category: null,
    kind: null,
    description: null,
    source: null,
    href: null,
    enteredBy: null,
    paidVia: null,
    records: 1,
    amount: 0,
    pct: null,
    ...o,
  })
  const report = (groupBy: ExpenseReport['table']['groupBy'], rows: ExpenseTableRow[]) =>
    ({
      today: '2026-11-15',
      period: { kind: 'month', month: '2026-10', from: '2026-10-01', to: '2026-10-31', label: 'October 2026', partial: false },
      filters: { category: null },
      cards: { recovered: { settlements: 0, transportRs: 0, fertilizerRs: 0, advancesRs: 0, totalRs: 1200 } },
      table: { groupBy, rows, totals: { records: rows.reduce((s, r) => s + r.records, 0), amount: rows.reduce((s, r) => s + r.amount, 0) } },
      loans: { totalRs: 40000 },
      wagesEstimate: { amountRs: 536400 },
    }) as unknown as ExpenseReport

  it('writes what is and isn’t counted, the rows as computed, then the totals', () => {
    const csv = expenseCsv(
      report('category', [
        row({ key: 'Green leaf purchases', name: 'Green leaf purchases', source: 'Leaf', records: 104, amount: 798201.5, pct: 98.4 }),
        row({ key: 'Electricity', name: 'Electricity', source: 'Manual', amount: 12800, pct: 1.6 }),
      ]),
    ).split('\r\n')
    expect(csv[1]).toBe('Period: October 2026')
    expect(csv[4]).toBe(
      'Not counted: recovered from estate owners Rs 1200.00; loans issued Rs 40000.00; estimated wages not yet processed Rs 536400.00',
    )
    expect(csv[6]).toBe('Category,Source,Records,Amount Rs,% of total')
    expect(csv.at(-1)).toBe('Total,,105,811001.50,100.0')
  })

  it('entry rows carry date, category, source and reference', () => {
    const csv = expenseCsv(
      report('entry', [row({ key: 'EXP-2026-0137', date: '2026-10-08', category: 'Electricity', description: 'CEB, factory', source: 'Manual', paidVia: 'bank', amount: 5200 })]),
    ).split('\r\n')
    expect(csv[6]).toBe('Date,Category,Description,Source,Reference,Paid via,Records,Amount Rs,% of total')
    expect(csv[7]).toBe('2026-10-08,Electricity,"CEB, factory",Manual,EXP-2026-0137,bank,1,5200.00,')
    expect(expenseCsvName(report('entry', []))).toBe('expenses-2026-10-entry.csv')
  })
})
