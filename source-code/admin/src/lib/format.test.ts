import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatDayMonth } from './format'

describe('one date format for the whole portal', () => {
  it('shows "10 Jul 2026" — no DD/MM vs MM/DD ambiguity', () => {
    expect(formatDate('2026-07-10')).toBe('10 Jul 2026')
    expect(formatDate('2026-07-08')).toBe('08 Jul 2026')
    expect(formatDate(new Date(2026, 11, 31))).toBe('31 Dec 2026')
  })

  it('reads a bare YYYY-MM-DD as that calendar day, never shifted by the time zone', () => {
    expect(formatDate('2026-01-01')).toBe('01 Jan 2026')
  })

  it('timestamps add the time; the short form drops the year', () => {
    expect(formatDateTime(new Date(2026, 6, 10, 14, 5))).toBe('10 Jul 2026, 14:05')
    expect(formatDayMonth('2026-11-12')).toBe('12 Nov')
  })
})
