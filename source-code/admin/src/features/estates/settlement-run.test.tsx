import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RunConfirmSummary, RunTotalsList } from './SettlementRunSummary'
import { dayRange, ratePeriodsText, totalsLines } from './settlement-run'
import type { SettlementRun } from './settlement-run-types'

const run = {
  month: '2026-07',
  period: 'July 2026',
  ratePeriods: [
    { rateId: 'GR-3', from: '2026-07-01', to: '2026-07-14', superRate: 185, normalRate: 95 },
    { rateId: 'GR-4', from: '2026-07-15', to: '2026-07-31', superRate: 190, normalRate: 98 },
  ],
  transport: { configured: true, reason: null },
  candidates: 3,
  prepared: 3,
  processed: 0,
  notPrepared: 0,
  rows: [
    {
      settlementId: 'SET-2026-07-019',
      status: 'Draft',
      estateId: 'EST-0001',
      estateName: 'Green Valley Estate',
      ownerName: 'X',
      route: 'R',
      payoutMethod: 'bank',
      calc: {} as never,
      changedSincePrepared: false,
      ready: false,
      reasons: ['1 delivery is not graded yet (GV-2026-0718).'],
    },
  ],
  waiting: [],
  legacy: [],
  totals: {
    estates: 2,
    superKg: 368,
    normalKg: 309,
    gross: 29355,
    adjustments: -50,
    transport: 1500,
    fertilizer: 10800,
    advances: 6887.5,
    deductions: 19187.5,
    carriedForward: 23112.5,
    net: 10117.5,
  },
} satisfies SettlementRun

const valuesIn = (html: string) =>
  [...html.matchAll(/data-total="([^"]+)"[^>]*>([^<]*)</g)].map(([, key, value]) => [key, value])

describe('settlement run display', () => {
  it('words the month’s rate periods', () => {
    expect(ratePeriodsText(run.ratePeriods)).toBe('Super/Normal: Rs. 185/95 (1–14 Jul), Rs. 190/98 (15–31 Jul)')
    expect(dayRange('2026-06-28', '2026-07-03')).toBe('28 Jun – 3 Jul')
  })

  it('the popup totals equal the Process page totals', () => {
    const page = valuesIn(renderToStaticMarkup(<RunTotalsList totals={run.totals} />))
    const popup = valuesIn(renderToStaticMarkup(<RunConfirmSummary run={run} />))
    expect(page).toHaveLength(totalsLines(run.totals).length)
    expect(popup).toEqual(page)
    expect(Object.fromEntries(page).net).toBe('Rs. 10,117.50')
  })

  it('the popup lists the period, who is excluded and why, and the freeze wording — no bank-file promise', () => {
    const html = renderToStaticMarkup(<RunConfirmSummary run={run} />)
    expect(html).toContain('July 2026')
    expect(html).toContain('Green Valley Estate')
    expect(html).toContain('not graded yet')
    expect(html).toContain('Processing freezes these settlements and their calculations. This cannot be undone.')
    expect(html).not.toMatch(/bank-ready payment file/i)
  })
})
