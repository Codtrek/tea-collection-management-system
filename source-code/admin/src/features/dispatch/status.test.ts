import { describe, expect, it } from 'vitest'
import { factoryToday, WEEKDAY_LABELS, weekdayOf } from './status'

describe('route schedule date helpers', () => {
  it('numbers weekdays like the backend (0 = Sunday) without shifting with the browser zone', () => {
    expect(weekdayOf('2026-10-09')).toBe(5)
    expect(WEEKDAY_LABELS[weekdayOf('2026-10-11')]).toBe('Sun')
  })

  it('reads "today" on the factory’s (Sri Lanka) calendar', () => {
    // 20:00 UTC on the 9th is already 01:30 on the 10th in Colombo
    expect(factoryToday(new Date('2026-10-09T20:00:00Z'))).toBe('2026-10-10')
    expect(factoryToday(new Date('2026-10-09T04:00:00Z'))).toBe('2026-10-09')
  })
})
