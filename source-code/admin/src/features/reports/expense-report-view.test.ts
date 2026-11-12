import { describe, expect, it } from 'vitest'
import { expenseQuery, expenseViewParams, readExpenseView } from './expense-report-view'

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
