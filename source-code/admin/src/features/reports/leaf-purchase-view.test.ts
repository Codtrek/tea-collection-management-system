import { describe, expect, it } from 'vitest'
import { leafPurchaseCsv, leafPurchaseCsvName, leafQuery, leafViewParams, readLeafView, settlementsHref } from './leaf-purchase-view'
import type { LeafGroupRow, LeafPurchaseReport, LeafTotals } from './types'

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

describe('export', () => {
  const totals = (o: Partial<LeafTotals>): LeafTotals => ({
    deliveries: 0,
    factoryKg: 0,
    superKg: 0,
    normalKg: 0,
    valueRs: 0,
    superRs: 0,
    normalRs: 0,
    rsPerKg: null,
    superRsPerKg: null,
    normalRsPerKg: null,
    settledRs: 0,
    unsettledRs: 0,
    noRateDeliveries: 0,
    noRateKg: 0,
    prevValueRs: 0,
    changePct: null,
    ...o,
  })
  const row = (name: string, o: Partial<LeafTotals>): LeafGroupRow => ({ ...totals(o), key: name, name, routeName: 'Route 5', id: 1 })
  const report = {
    period: { label: 'October 2026', partial: false, month: '2026-10', from: '2026-10-01', to: '2026-10-31' },
    options: { routes: [], estates: [{ id: 42, name: 'Uda Radella Estate (demo)', routeName: 'Route 5', demo: true }] },
    table: {
      groupBy: 'estate',
      rows: [
        row('Uda Radella Estate (demo)', { deliveries: 4, factoryKg: 295.1, superKg: 150.3, normalKg: 144.8, valueRs: 41561.5, rsPerKg: 140.84, unsettledRs: 41561.5, changePct: 8.5 }),
        row('Hilltop Estate, North', { deliveries: 1, factoryKg: 40, superKg: 0, normalKg: 40, valueRs: 3800, rsPerKg: 95, settledRs: 3800 }),
      ],
      totals: totals({ deliveries: 5, factoryKg: 335.1, superKg: 150.3, normalKg: 184.8, valueRs: 45361.5, rsPerKg: 135.37, settledRs: 3800, unsettledRs: 41561.5, changePct: 2.1 }),
    },
  } as unknown as LeafPurchaseReport
  const view = readLeafView(new URLSearchParams('estate=42'), true)

  it('is the table as the server computed it: every row, then the totals row', () => {
    const lines = leafPurchaseCsv(report, view).split('\r\n')
    expect(lines.slice(0, 4)).toEqual([
      'Leaf Purchase Report',
      'Period: October 2026',
      'Filters: Estate: Uda Radella Estate (demo)',
      'Leaf value: graded kg × the grade rate in force on each delivery date',
    ])
    const table = lines.slice(5)
    expect(table[0]).toBe(
      'Estate,Route,Deliveries,Factory kg,Super kg,Normal kg,Leaf value Rs,Rs per kg,Settled Rs,Not yet settled Rs,Change vs previous %',
    )
    expect(table[1]).toBe('Uda Radella Estate (demo),Route 5,4,295.1,150.3,144.8,41561.50,140.84,0.00,41561.50,8.5')
    expect(table[2]).toBe('"Hilltop Estate, North",Route 5,1,40.0,0.0,40.0,3800.00,95.00,3800.00,0.00,')
    expect(table[3]).toBe('Total,,5,335.1,150.3,184.8,45361.50,135.37,3800.00,41561.50,2.1')
    expect(table).toHaveLength(report.table.rows.length + 2)
  })

  it('names the file after the period and grouping', () => {
    expect(leafPurchaseCsvName(report)).toBe('leaf-purchases-2026-10-estate.csv')
  })
})
