import { describe, expect, it } from 'vitest'
import { advanceParams, advanceQuery, presetRange, readAdvanceFilters } from './advance-filters'

const TODAY = '2026-11-01'
const read = (qs: string) => readAdvanceFilters(new URLSearchParams(qs))

describe('EMP-10 date presets', () => {
  it('This month / Last month / Last 3 months, across a year end', () => {
    expect(presetRange('this-month', TODAY)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(presetRange('last-month', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(presetRange('last-3-months', TODAY)).toEqual({ from: '2026-09-01', to: '2026-11-30' })
    expect(presetRange('last-month', '2027-01-15')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(presetRange('this-month', '2028-02-10').to).toBe('2028-02-29')
  })
})

describe('EMP-10 filters in the URL', () => {
  it('opens on "Needs decision", this month; round-trips the rest', () => {
    expect(read('')).toMatchObject({ tab: 'decide', preset: 'this-month', page: 0 })
    expect(advanceParams(read('')).toString()).toBe('')
    const qs = 'tab=approved&range=custom&from=2026-07-01&to=2026-07-31&q=perera&role=Factory+Officer&route=2&min=1000&max=50000&page=1'
    expect(advanceParams(read(qs)).toString()).toBe(qs)
  })

  it('the API query carries the range — the server keeps pending requests outside it on "Needs decision"', () => {
    expect(advanceQuery(read(''), TODAY)).toMatchObject({ tab: 'decide', from: '2026-11-01', to: '2026-11-30' })
    expect(advanceQuery(read('range=custom'), TODAY)).toMatchObject({ from: undefined, to: undefined })
    expect(advanceQuery(read('route=2&min=500'), TODAY)).toMatchObject({ routeId: 2, min: 500 })
  })
})
