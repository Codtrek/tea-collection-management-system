import { describe, expect, it } from 'vitest'
import { collectionParams, filterCollections, linkFilterLabels, readCollectionFilters } from './collection-filters'
import type { CollectionRecord } from './types'

const read = (qs: string) => readCollectionFilters(new URLSearchParams(qs))
const rec = (id: string, date: string, status: CollectionRecord['status'], extra: Partial<CollectionRecord> = {}) =>
  ({ id, estateName: `Estate ${id}`, route: 'Route 1', date, status, graded: false, gradeLines: [], ...extra }) as unknown as CollectionRecord

const rows = [
  rec('A', '2026-11-17', 'Collected'),
  rec('B', '2026-11-17', 'Collected', { graded: true }),
  rec('C', '2026-11-10', 'Collected'),
  rec('D', '2026-11-11', 'Collected'),
  rec('E', '2026-11-01', 'Confirmed', { graded: true, pendingCorrectionId: 4 }),
]

describe('COL-01 filters in the URL (Dashboard links)', () => {
  it('round-trips every filter; junk is ignored', () => {
    const f = read('q=gv&route=Route+1&grade=Ungraded&status=Collected&date=2026-11-17&olderThan=7&corrections=pending')
    expect(collectionParams(f).toString()).toBe('q=gv&route=Route+1&grade=Ungraded&status=Collected&date=2026-11-17&olderThan=7&corrections=pending')
    expect(read('date=17/11/2026&olderThan=-3&corrections=yes')).toMatchObject({ date: '', olderThan: null, corrections: false })
    expect(collectionParams(read('')).toString()).toBe('')
  })

  it('waiting for grading today — the Dashboard’s count', () => {
    expect(filterCollections(rows, read('grade=Ungraded&status=Collected&date=2026-11-17'), '2026-11-17').map((r) => r.id)).toEqual(['A'])
  })

  it('ungraded for more than 7 days = dated on or before today − 7', () => {
    expect(filterCollections(rows, read('grade=Ungraded&status=Collected&olderThan=7'), '2026-11-17').map((r) => r.id)).toEqual(['C'])
  })

  it('a correction request waiting', () => {
    expect(filterCollections(rows, read('corrections=pending'), '2026-11-17').map((r) => r.id)).toEqual(['E'])
  })

  it('the link-only filters are named in the chip', () => {
    expect(linkFilterLabels(read('date=2026-11-17&olderThan=7&corrections=pending'), (d) => `<${d}>`)).toEqual([
      'Delivered <2026-11-17>',
      'Delivered 7 or more days ago',
      'Correction request waiting',
    ])
  })
})
