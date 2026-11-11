import { describe, expect, it } from 'vitest'
import { leafQuery, leafViewParams, readLeafView, settlementsHref } from './leaf-purchase-view'

describe('RPT-02 view state lives in the URL', () => {
  it('round-trips every filter, so a link reproduces the view', () => {
    const qs = 'from=2026-05-01&to=2026-10-31&route=3&estate=42&grade=normal&demo=0&group=month'
    const v = readLeafView(new URLSearchParams(qs), true)
    expect(v).toMatchObject({ from: '2026-05-01', to: '2026-10-31', routeId: 3, estateId: 42, grade: 'normal', includeDemo: false, groupBy: 'month' })
    expect(leafViewParams(v, true).toString()).toBe(qs)
  })

  it('keeps defaults out of the URL (last complete month, estate grouping, demo default)', () => {
    const v = readLeafView(new URLSearchParams(), true)
    expect(v).toMatchObject({ groupBy: 'estate', includeDemo: true })
    expect(v.month ?? v.from ?? v.thisMonth).toBeUndefined()
    expect(leafViewParams(v, true).toString()).toBe('')
  })

  it('ignores an agent filter and unknown groupings — agents are not a leaf-purchase dimension', () => {
    const v = readLeafView(new URLSearchParams('agent=7&group=agent'), true)
    expect(v.groupBy).toBe('estate')
    expect(leafQuery(v)).not.toHaveProperty('agentId')
  })

  it('links Estate Owner Payments to the month the period ends in', () => {
    expect(settlementsHref({ period: { to: '2026-10-31' } } as never)).toBe('/estates/settlements?month=2026-10')
  })
})
