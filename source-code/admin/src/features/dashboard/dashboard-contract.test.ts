import { describe, expect, it } from 'vitest'
import { DASHBOARD_SUMMARY_KEYS, MISSING_SECTION, parseSummary } from '@/services/dashboard'
import live from './__fixtures__/summary-live.json'

/*
  The portal and the backend agree on one response. `live` is GET /dashboard/summary as recorded
  from the scratch database (tea_dash_check) for an Officer and a Manager; the backend's
  dashboard.service.spec.ts checks its own keys against the same list.
*/
describe('GET /dashboard/summary contract', () => {
  it('the recorded response has exactly the agreed keys, for each role', () => {
    for (const summary of Object.values(live)) {
      expect(Object.keys(summary)).toEqual([...DASHBOARD_SUMMARY_KEYS])
    }
  })

  it('the recorded response parses with nothing reported missing', () => {
    for (const summary of Object.values(live)) {
      const parsed = parseSummary(summary)
      expect(parsed.errors).toEqual({})
      expect(Object.keys(parsed)).toEqual([...DASHBOARD_SUMMARY_KEYS])
      // the old design's field is gone, on both sides
      expect('quickActions' in parsed).toBe(false)
    }
  })

  it('the queue rows carry what the page renders (the Manager’s queue is empty in this data)', () => {
    expect(live.Officer.actions.length).toBeGreaterThan(0)
    expect(live.Manager.actions).toEqual([])
    expect(live.Manager.primaryAction).toBeNull()
    for (const a of live.Officer.actions) {
      expect(a).toEqual(
        expect.objectContaining({ key: expect.any(String), count: expect.any(Number), label: expect.any(String), href: expect.any(String), group: expect.any(String), action: expect.any(String) }),
      )
    }
    expect(live.Officer.primaryAction).toEqual({ label: live.Officer.actions[0].action, href: live.Officer.actions[0].href, key: live.Officer.actions[0].key })
  })

  it('null means "not for this role"; a missing key is reported', () => {
    const officer = parseSummary(live.Officer)
    expect(officer.monthView).toBeNull()
    expect(officer.errors.month).toBeUndefined()
    const withoutCharts = { ...live.Manager } as Record<string, unknown>
    delete withoutCharts.charts
    expect(parseSummary(withoutCharts).errors).toEqual({ charts: MISSING_SECTION })
    expect(() => parseSummary(null)).toThrow()
  })
})
