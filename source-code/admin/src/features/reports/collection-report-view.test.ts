import { describe, expect, it } from 'vitest'
import { collectionViewParams, estateTimelineHref, readCollectionView, reportQuery, signedPct } from './collection-report-view'

describe('RPT-01 view state lives in the URL', () => {
  it('round-trips every filter, so a link reproduces the view', () => {
    const qs = 'month=2026-09&route=2&agent=7&estate=12&grade=super&demo=0&group=route&lastYear=1'
    const v = readCollectionView(new URLSearchParams(qs), true)
    expect(v).toMatchObject({ month: '2026-09', routeId: 2, agentId: 7, estateId: 12, grade: 'super', includeDemo: false, groupBy: 'route', compareLastYear: true })
    expect(collectionViewParams(v, true).toString()).toBe(qs)
  })

  it('keeps defaults out of the URL (last complete month, estate grouping, demo default)', () => {
    const v = readCollectionView(new URLSearchParams(), true)
    expect(v).toMatchObject({ groupBy: 'estate', includeDemo: true, compareLastYear: false })
    expect(v.month).toBeUndefined()
    expect(collectionViewParams(v, true).toString()).toBe('')
  })

  it('demo data defaults on in development only; an explicit choice wins', () => {
    expect(readCollectionView(new URLSearchParams(), false).includeDemo).toBe(false)
    expect(readCollectionView(new URLSearchParams('demo=1'), false).includeDemo).toBe(true)
    expect(collectionViewParams(readCollectionView(new URLSearchParams('demo=1'), false), false).toString()).toBe('demo=1')
  })

  it('reads a custom range or "this month so far"; ignores malformed values', () => {
    expect(readCollectionView(new URLSearchParams('from=2026-08-01&to=2026-10-31'), true)).toMatchObject({ from: '2026-08-01', to: '2026-10-31' })
    expect(readCollectionView(new URLSearchParams('thisMonth=1&month=2026-01'), true)).toMatchObject({ thisMonth: true })
    const bad = readCollectionView(new URLSearchParams('month=2026-13&from=2026-10-31&to=2026-10-01&route=x&grade=gold&group=owner'), true)
    expect(bad).toMatchObject({ groupBy: 'estate' })
    expect(bad.month ?? bad.from ?? bad.routeId ?? bad.grade).toBeUndefined()
  })

  it('asks the API for the same view', () => {
    const v = readCollectionView(new URLSearchParams('from=2026-08-01&to=2026-10-31&group=day&lastYear=1'), true)
    expect(reportQuery(v)).toEqual({ from: '2026-08-01', to: '2026-10-31', includeDemo: true, groupBy: 'day', month: undefined, thisMonth: undefined, routeId: undefined, agentId: undefined, estateId: undefined, grade: undefined })
  })
})

describe('links and labels', () => {
  it('estate rows open the EST-10 timeline', () => {
    expect(estateTimelineHref(42)).toBe('/estates/EST-0042?tab=timeline')
  })
  it('signed percentages', () => {
    expect(signedPct(4.25)).toBe('+4.3%')
    expect(signedPct(-3)).toBe('−3.0%')
    expect(signedPct(null)).toBe('—')
    expect(signedPct(2, ' pts')).toBe('+2.0 pts')
    expect(signedPct(4896.8)).toBe('+4,896.8%')
  })
})
