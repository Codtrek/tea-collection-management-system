import { describe, expect, it } from 'vitest'
import { availabilityLabel, coverageDisplay, fefoPrefix, itemsBelowDemand, nextInQueue, positionLabel, queueParams, queueRows, readQueueFilters } from './lib'
import type { FertilizerRequest, ItemPosition } from './types'

const req = (id: string, status: FertilizerRequest['status'], requestedDate: string, extra: Partial<FertilizerRequest> = {}) =>
  ({ id, status, requestedDate, estateName: 'Green Valley Estate', item: 'Urea', origin: 'web', orderRef: null, ...extra }) as FertilizerRequest

describe('FERT-05 filters live in the URL', () => {
  it('round-trips, with "To decide" as the default tab and unknown tabs ignored', () => {
    const f = { tab: 'closed', search: 'urea', status: 'Rejected', origin: 'web' }
    expect(readQueueFilters(queueParams(f))).toEqual(f)
    expect(readQueueFilters(new URLSearchParams())).toEqual({ tab: 'decide', search: '', status: '', origin: '' })
    expect(readQueueFilters(new URLSearchParams('tab=nope')).tab).toBe('decide')
    expect(queueParams({ tab: 'decide', search: '', status: '', origin: '' }).toString()).toBe('')
  })
})

describe('queueRows + nextInQueue — "Next request" follows the queue', () => {
  const all = [
    req('FR-3', 'Requested', '2026-10-20'),
    req('FR-1', 'Requested', '2026-10-01'),
    req('FR-2', 'Awaiting manager approval', '2026-10-10'),
    req('FR-4', 'Delivered', '2026-10-05'),
    req('FR-5', 'Requested', '2026-10-15', { estateName: 'Hilltop Estate' }),
  ]
  const decide = { tab: 'decide', search: '', status: '', origin: '' }

  it('lists the decide tab oldest first, other tabs newest first', () => {
    expect(queueRows(all, decide).map((r) => r.id)).toEqual(['FR-1', 'FR-2', 'FR-5', 'FR-3'])
    expect(queueRows(all, { ...decide, tab: 'all' }).map((r) => r.id)[0]).toBe('FR-3')
  })

  it('applies the search filter', () => {
    expect(queueRows(all, { ...decide, search: 'hilltop' }).map((r) => r.id)).toEqual(['FR-5'])
  })

  it('moves to the row after the current one while it is still listed', () => {
    expect(nextInQueue(queueRows(all, decide), 'FR-2')?.id).toBe('FR-5')
    expect(nextInQueue(queueRows(all, decide), 'FR-3')).toBeNull()
  })

  it('a decided request that left the tab hands over to the first row', () => {
    const afterRejecting = all.map((r) => (r.id === 'FR-1' ? { ...r, status: 'Rejected' as const } : r))
    expect(nextInQueue(queueRows(afterRejecting, decide), 'FR-1')?.id).toBe('FR-2')
  })
})

describe('Coverage column — capped', () => {
  it('shows ">999%" instead of 4333%, draws the bar from the capped value, and says "No demand" with nothing pending', () => {
    expect(coverageDisplay(1300 / 30)).toEqual({ text: '>999%', barPct: 100 })
    expect(coverageDisplay(0.75)).toEqual({ text: '75%', barPct: 75 })
    expect(coverageDisplay(1.5)).toEqual({ text: '150%', barPct: 100 })
    expect(coverageDisplay(-0.2)).toEqual({ text: '0%', barPct: 0 })
    expect(coverageDisplay(null)).toEqual({ text: 'No demand', barPct: null })
  })
})

describe('request availability wording — reads the server verdict', () => {
  const base = { available: 1300, fefo: [], expiringBatch: null }
  it('"expiring" names the batch date and days left, so it is never read as "expired"', () => {
    expect(
      availabilityLabel({ ...base, verdict: 'covered-expiring', expiringBatch: { expiryDate: '2026-11-12', daysToExpiry: 14 } }, 30).text,
    ).toBe('✓ Covered · uses batch expiring 12 Nov (14 days)')
    expect(availabilityLabel({ ...base, verdict: 'covered' }, 30).text).toBe('✓ Covered')
  })
  it('says when the only stock has expired', () => {
    expect(availabilityLabel({ ...base, available: 0, verdict: 'none-expired' }, 77)).toEqual({
      text: '✕ Not available (stock expired)',
      tone: 'danger',
    })
  })
})

describe('FERT-01 reads the server status — never recomputes it', () => {
  const pos = (status: ItemPosition['status'], extra: Partial<ItemPosition> = {}) =>
    ({ item: status, status, shortKg: 0, available: 0, pendingDemand: 0, ...extra }) as ItemPosition
  it('"Items below demand" = Out of stock or Short, as the server marked them', () => {
    const list = [pos('Out of stock'), pos('Short', { shortKg: 50 }), pos('Fully committed'), pos('Expiring soon'), pos('Healthy')]
    expect(itemsBelowDemand(list).map((p) => p.status)).toEqual(['Out of stock', 'Short'])
    expect(positionLabel(list[1])).toBe('Short 50 kg')
    expect(positionLabel(list[2])).toBe('Fully committed')
  })
  it('a partial approval previews the first kg of the server FEFO plan', () => {
    const plan = [
      { batchId: 'FB-0002', lotNumber: 'A', expiryDate: '2026-11-15', daysToExpiry: 17, take: 20 },
      { batchId: 'FB-0001', lotNumber: 'B', expiryDate: '2026-12-01', daysToExpiry: 33, take: 50 },
    ]
    expect(fefoPrefix(plan, 30).map((s) => [s.batchId, s.take])).toEqual([
      ['FB-0002', 20],
      ['FB-0001', 10],
    ])
  })
})
