import { describe, expect, it } from 'vitest'
import { factoryToday, freshnessShort, otherRoutesNote, WEEKDAY_LABELS, weekdayOf } from './status'

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

describe('board table cells stay on one line', () => {
  it('shortens "Last seen" to a time, an age, or "No location"', () => {
    expect(freshnessShort({ freshness: 'none', ageMin: null, lastSeen: null })).toBe('No location')
    expect(freshnessShort({ freshness: 'recent', ageMin: 8.2, lastSeen: '2026-10-29T05:00:00Z' })).toBe('8 min ago')
    expect(freshnessShort({ freshness: 'stale', ageMin: 300, lastSeen: '2026-10-29T05:46:00Z' })).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('otherRoutesNote — the Route cell never repeats "Not scheduled"', () => {
  const r3 = { routeId: 3, name: 'Route 3' }
  const r4 = { routeId: 4, name: 'Route 4' }
  it('says "Also holds" only under a route that runs that day', () => {
    expect(otherRoutesNote({ ownRoutes: [r3, r4], scheduledRoutes: [{ ...r3, covering: false }] })).toBe('Also holds Route 4')
  })
  it('says "Holds:" when none of his routes runs that day', () => {
    expect(otherRoutesNote({ ownRoutes: [r3, r4], scheduledRoutes: [] })).toBe('Holds: Route 3, Route 4')
  })
  it('nothing extra when everything he holds is running; "Unassigned" with no routes at all', () => {
    expect(otherRoutesNote({ ownRoutes: [r3], scheduledRoutes: [{ ...r3, covering: false }] })).toBeNull()
    expect(otherRoutesNote({ ownRoutes: [], scheduledRoutes: [{ routeId: 9, name: 'Route 9', covering: true }] })).toBeNull()
    expect(otherRoutesNote({ ownRoutes: [], scheduledRoutes: [] })).toBe('Unassigned')
  })
})
