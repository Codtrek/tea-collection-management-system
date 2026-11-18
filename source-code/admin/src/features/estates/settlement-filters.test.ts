import { describe, expect, it } from 'vitest'
import { toCsv } from '@/lib/csv'
import { hasActiveFilters, readSettlementFilters, settlementParams, settlementQuery } from './settlement-filters'

const NOW = '2026-11'
const read = (qs: string) => readSettlementFilters(new URLSearchParams(qs), NOW)

describe('EST-07 period view — month and filters in the URL', () => {
  it('opens on last month; a future or malformed month falls back to it; "all" is kept', () => {
    expect(read('').month).toBe('2026-10')
    expect(read('month=2027-01').month).toBe('2026-10')
    expect(read('month=2026-13').month).toBe('2026-10')
    expect(read('month=2026-07').month).toBe('2026-07')
    expect(read('month=2026-11').month).toBe('2026-11')
    expect(read('month=all').month).toBe('all')
  })

  it('round-trips every filter, and the default view is a bare URL', () => {
    const f = read('month=2026-07&q=silva&route=2&status=Pending&method=cash&net=nonpositive&sort=net&dir=desc&page=1')
    expect(settlementParams(f, NOW).toString()).toBe(
      'month=2026-07&q=silva&route=2&status=Pending&method=cash&net=nonpositive&sort=net&dir=desc&page=1',
    )
    expect(settlementParams(read(''), NOW).toString()).toBe('')
  })

  it('builds the API query; the export asks for every row', () => {
    const f = read('month=2026-07&route=2&net=nonpositive&page=2')
    expect(settlementQuery(f)).toMatchObject({ month: '2026-07', routeId: 2, nonPositive: true, page: 2, limit: 25 })
    expect(settlementQuery(f, 0)).toMatchObject({ limit: 0, page: undefined })
  })

  it('only filters beyond the month count as "active"', () => {
    expect(hasActiveFilters(read('month=2026-07'))).toBe(false)
    expect(hasActiveFilters(read('month=2026-07&status=Pending'))).toBe(true)
  })
})

describe('CSV export', () => {
  it('quotes commas, quotes and newlines', () => {
    const csv = toCsv([{ header: 'Estate', value: (r: { n: string }) => r.n }], [{ n: 'Green, "Valley"' }])
    expect(csv).toBe('Estate\r\n"Green, ""Valley"""')
  })
})
