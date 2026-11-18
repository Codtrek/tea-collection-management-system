import { describe, expect, it } from 'vitest'
import { cellText, lastCompleteMonth, performanceParams, readPerformanceParams } from './performance-view'
import type { Measure } from './types'

const TODAY = '2026-11-05'
const m = (over: Partial<Measure>): Measure => ({ key: 'routeCompletion', status: 'ok', value: 90, num: 18, den: 20, trend: null, previous: null, ...over })

describe('month URL state', () => {
  it('defaults to agents, the last complete month, one month', () => {
    expect(readPerformanceParams(new URLSearchParams(), TODAY)).toEqual({ tab: 'agents', month: '2026-10', span: 1 })
    expect(lastCompleteMonth('2026-01-10')).toBe('2025-12')
  })

  it('reads ?tab=&month=&span= and refuses future months', () => {
    expect(readPerformanceParams(new URLSearchParams('tab=staff&month=2026-07&span=3'), TODAY)).toEqual({ tab: 'staff', month: '2026-07', span: 3 })
    expect(readPerformanceParams(new URLSearchParams('month=2026-12'), TODAY).month).toBe('2026-10')
  })

  it('round-trips and leaves defaults out', () => {
    expect(performanceParams({ tab: 'agents', month: '2026-10', span: 1 }, TODAY).toString()).toBe('')
    expect(performanceParams({ tab: 'staff', month: '2026-07', span: 3 }, TODAY).toString()).toBe('tab=staff&month=2026-07&span=3')
  })
})

describe('cells', () => {
  it('every percentage shows its counts', () => {
    expect(cellText(m({})).main).toBe('90% (18/20)')
  })

  it('too little data is text, never a number', () => {
    expect(cellText(m({ status: 'not_enough', value: null, reason: 'Fewer than 5 route days' }))).toEqual({
      main: 'Not enough data',
      sub: 'Fewer than 5 route days',
      muted: true,
    })
  })

  it('fertilizer shows owner-side failures separately', () => {
    expect(cellText(m({ key: 'fertilizer', value: 60, num: 3, den: 5, extra: { ownerSide: 1, otherFailures: 1 } })).sub).toBe(
      'Failed: 1 owner-side, 1 other',
    )
  })

  it('kg shows the total and the comparison with the route’s own average', () => {
    expect(cellText(m({ key: 'kg', value: 850, num: 850, den: 900, extra: { vsRouteAverage: 94.4 } }))).toMatchObject({
      main: '850 kg',
      sub: '94.4% of route average (850/900 kg)',
    })
  })
})
