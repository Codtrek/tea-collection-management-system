import { describe, expect, it } from 'vitest'
import { estateAdvanceParams, estateAdvanceQuery, readEstateAdvanceFilters } from './estate-advance-filters'

const read = (qs: string) => readEstateAdvanceFilters(new URLSearchParams(qs))

describe('estate advance filters', () => {
  it('defaults to this month, no filters, first page', () => {
    const f = read('')
    expect(f).toMatchObject({ preset: 'this-month', search: '', route: '', status: '', issuedBy: '', page: 0 })
    expect(estateAdvanceQuery(f, '2026-11-01')).toMatchObject({ from: '2026-11-01', to: '2026-11-30', page: 0, limit: 25 })
    expect(estateAdvanceParams(f).toString()).toBe('')
  })

  it('round-trips every filter through the URL', () => {
    const qs = 'range=custom&from=2026-05-01&to=2026-07-31&q=green&route=2&status=Deducted&by=A.+Bandara&page=1'
    const f = read(qs)
    expect(estateAdvanceParams(f).toString()).toBe(qs)
    expect(estateAdvanceQuery(f, '2026-11-01')).toEqual({
      from: '2026-05-01',
      to: '2026-07-31',
      search: 'green',
      routeId: 2,
      status: 'Deducted',
      issuedBy: 'A. Bandara',
      page: 1,
      limit: 25,
    })
  })

  it('drops unknown values instead of sending them', () => {
    const f = read('range=forever&status=Lost&from=yesterday&route=x')
    expect(f.preset).toBe('this-month')
    expect(f.status).toBe('')
    expect(estateAdvanceQuery(f, '2026-11-01').routeId).toBeUndefined()
  })

  it('custom with no dates means no limit', () => {
    expect(estateAdvanceQuery(read('range=custom'), '2026-11-01')).toMatchObject({ from: undefined, to: undefined })
  })
})
