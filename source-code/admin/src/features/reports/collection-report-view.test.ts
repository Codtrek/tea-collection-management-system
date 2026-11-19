import { describe, expect, it } from 'vitest'
import {
  collectionCsv,
  collectionCsvName,
  collectionViewParams,
  estateTimelineHref,
  readCollectionView,
  reportQuery,
  signedPct,
} from './collection-report-view'
import type { CollectionGroupRow, CollectionReport, CollectionTotals } from './types'

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

describe('export', () => {
  const totals = (o: Partial<CollectionTotals>): CollectionTotals => ({
    deliveries: 0,
    estateKg: 0,
    factoryKg: 0,
    diffPct: null,
    overTolerance: 0,
    superKg: 0,
    normalKg: 0,
    superShare: null,
    ungradedDeliveries: 0,
    ungradedEstateKg: 0,
    provisional: 0,
    prevFactoryKg: 0,
    changePct: null,
    ...o,
  })
  const row = (name: string, o: Partial<CollectionTotals>): CollectionGroupRow => ({
    ...totals(o),
    key: name,
    name,
    routeName: 'Route 3',
    id: 1,
  })
  const report = {
    period: { label: 'October 2026', partial: false, month: '2026-10', from: '2026-10-01', to: '2026-10-31' },
    tolerancePct: 5,
    options: { routes: [{ id: 3, name: 'Route 3' }], agents: [], estates: [] },
    table: {
      groupBy: 'estate',
      rows: [
        row('Uda Radella Estate (demo)', { deliveries: 4, estateKg: 306, factoryKg: 295.1, diffPct: 3.6, superKg: 150.3, normalKg: 144.8, superShare: 50.9, changePct: 6.8 }),
        row('Hilltop Estate, North', { deliveries: 0, estateKg: 0, factoryKg: 0, ungradedDeliveries: 3, ungradedEstateKg: 190 }),
      ],
      totals: totals({ deliveries: 4, estateKg: 306, factoryKg: 295.1, diffPct: 3.6, superKg: 150.3, normalKg: 144.8, superShare: 50.9, ungradedDeliveries: 3, ungradedEstateKg: 190, changePct: 1.2 }),
    },
  } as unknown as CollectionReport
  const view = readCollectionView(new URLSearchParams('route=3&demo=0'), true)

  it('is the table as the server computed it: every row, then the totals row', () => {
    const lines = collectionCsv(report, view).split('\r\n')
    expect(lines.slice(0, 4)).toEqual([
      'Collection Report',
      'Period: October 2026',
      'Filters: Route: Route 3 · demo data excluded',
      'Weights: factory kg = sum of grade lines of graded deliveries; tolerance 5%',
    ])
    const table = lines.slice(5)
    expect(table[0]).toBe(
      'Estate,Route,Deliveries,Estate kg,Factory kg,Difference %,Super kg,Normal kg,Super share %,Ungraded deliveries,Ungraded estate kg,Change vs previous %',
    )
    expect(table[1]).toBe('Uda Radella Estate (demo),Route 3,4,306.0,295.1,3.6,150.3,144.8,50.9,0,0.0,6.8')
    expect(table[2]).toBe('"Hilltop Estate, North",Route 3,0,0.0,0.0,,0.0,0.0,,3,190.0,')
    expect(table[3]).toBe('Total,,4,306.0,295.1,3.6,150.3,144.8,50.9,3,190.0,1.2')
    expect(table).toHaveLength(report.table.rows.length + 2)
  })

  it('names the file after the period and grouping', () => {
    expect(collectionCsvName(report)).toBe('collection-report-2026-10-estate.csv')
  })
})
