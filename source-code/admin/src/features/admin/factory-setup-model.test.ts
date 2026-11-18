import { describe, expect, it } from 'vitest'
import { addDays, addMonths, dateTaken, latestLive, monthName, sameDraft, transportMonthOptions, versionBefore } from './factory-setup-model'
import type { VersionStatus } from './types'

const v = (effectiveDate: string, status: VersionStatus, rate = 1) => ({ effectiveDate, status, rate })

describe('Factory Setup versions', () => {
  const rows = [v('2026-01-01', 'past', 100), v('2026-04-01', 'current', 110), v('2026-12-01', 'scheduled', 120), v('2026-12-15', 'cancelled', 999)]

  it('a new version follows the latest live one before its date; cancelled ones are ignored', () => {
    expect(versionBefore(rows, '2026-12-20')?.rate).toBe(120)
    expect(versionBefore(rows, '2026-11-16')?.rate).toBe(110)
    expect(versionBefore(rows, '2026-01-01')).toBeNull()
    expect(latestLive(rows)?.rate).toBe(120)
  })

  it('a cancelled version frees its date', () => {
    expect(dateTaken(rows, '2026-12-01')).toBe(true)
    expect(dateTaken(rows, '2026-12-15')).toBe(false)
  })

  it('tomorrow, across a month end', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('an edit back to the starting values is not unsaved', () => {
    expect(sameDraft({ a: '185', b: 95 }, { a: 185, b: '95' })).toBe(true)
    expect(sameDraft({ a: '186', b: 95 }, { a: 185, b: 95 })).toBe(false)
  })
})

describe('transport month options (Administration-Addendum §4)', () => {
  it('next month onward; past months only while the first version can be back-dated', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(monthName('2026-07')).toBe('July 2026')
    const first = transportMonthOptions('2026-12', '2026-07')
    expect(first.slice(0, 6)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'])
    const later = transportMonthOptions('2026-12', null)
    expect(later[0]).toBe('2026-12')
    expect(later).toHaveLength(24)
  })
})
