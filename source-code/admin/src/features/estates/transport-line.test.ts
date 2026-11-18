import { describe, expect, it } from 'vitest'
import { transportLineText } from './transport-line'
import type { TransportLine } from './types'

const line = (o: Partial<TransportLine> = {}): TransportLine => ({
  status: 'charged',
  charge: 5000,
  carriedIn: 0,
  taken: 5000,
  carriedOut: 0,
  versionId: 1,
  versionMonth: '2026-07',
  frozen: false,
  ...o,
})

describe('transportLineText (Administration-Addendum §4)', () => {
  it('names the monthly charge and the version it came from', () => {
    expect(transportLineText({ transport: line(), transportCost: 5000, selfDelivery: false })).toEqual({
      label: 'Less: Transport (fixed monthly) Rs. 5,000 — version effective July 2026',
      value: '- Rs. 5,000',
      notes: [],
      notConfigured: false,
    })
  })

  it('exempt, no deliveries and not configured each say so', () => {
    expect(transportLineText({ transport: line({ status: 'exempt', charge: 0, taken: 0 }), transportCost: 0, selfDelivery: true }).label).toBe(
      'Less: Transport — exempt (self-delivery)',
    )
    expect(transportLineText({ transport: line({ status: 'no_deliveries', charge: 0, taken: 0 }), transportCost: 0, selfDelivery: false })).toMatchObject({
      label: 'Less: Transport — no deliveries this month, no charge',
      value: '—',
    })
    expect(transportLineText({ transport: line({ status: 'not_configured', taken: 0 }), transportCost: 0, selfDelivery: false })).toMatchObject({
      value: 'Not configured',
      notConfigured: true,
    })
  })

  it('explains carries in and out', () => {
    const t = transportLineText({ transport: line({ carriedIn: 2000, taken: 4000, carriedOut: 3000 }), transportCost: 4000, selfDelivery: false })
    expect(t.notes).toEqual([
      'Includes Rs. 2,000 carried from the estate’s last settlement.',
      'Rs. 3,000 couldn’t be covered by this settlement and is carried to the next one.',
    ])
  })

  it('older history shows its stored figure', () => {
    expect(transportLineText({ transport: null, transportCost: 8400, selfDelivery: false })).toMatchObject({
      label: 'Less: Transport cost',
      value: '- Rs. 8,400',
    })
  })
})
