import { describe, expect, it } from 'vitest'
import { tickedCounts, trimIcsToYear } from './import-model'

const ICS = [
  'BEGIN:VCALENDAR',
  'X-WR-CALNAME:Holidays in Sri Lanka',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20251225',
  'SUMMARY:Christmas Day',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20260530',
  'SUMMARY:Vesak Full Moon Poya Day',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('import helpers', () => {
  it('trims an uploaded .ics to the chosen year', () => {
    const out = trimIcsToYear(ICS, 2026)
    expect(out).toContain('Vesak Full Moon Poya Day')
    expect(out).not.toContain('Christmas Day')
    expect(out.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(out.endsWith('END:VCALENDAR')).toBe(true)
  })

  it('counts the ticked rows per type', () => {
    expect(
      tickedCounts([
        { type: 'poya', include: true },
        { type: 'public', include: true },
        { type: 'public', include: false },
      ]),
    ).toEqual({ poya: 1, public: 1 })
  })
})
