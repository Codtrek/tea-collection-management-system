import { describe, expect, it } from 'vitest'
import { nextInQueue, queueParams, queueRows, readQueueFilters } from './lib'
import type { FertilizerRequest } from './types'

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
