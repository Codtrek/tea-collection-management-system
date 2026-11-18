import { describe, expect, it } from 'vitest'
import type { Holiday, HolidayRequest, HolidayYear } from '@/features/employees/types'
import {
  calendarParams,
  chipsFor,
  monthMatrix,
  readCalendarParams,
  shadeFor,
  upcoming,
  visibleChips,
  weekdayHeader,
} from './calendar-model'

const TODAY = '2026-11-05'

const holiday = (over: Partial<Holiday>): Holiday => ({
  id: 1,
  date: '2026-11-24',
  name: 'Il Full Moon Poya Day',
  type: 'poya',
  paid: true,
  workAllowed: true,
  appliesTo: 'all',
  collectionStops: false,
  declareGroup: null,
  reason: null,
  createdBy: 'A. Bandara',
  createdAt: null,
  source: 'google',
  importedAt: null,
  cancelled: false,
  cancelReason: null,
  canChange: true,
  ...over,
})

type Rule = HolidayYear['weeklyRules'][number]
const rule = (over: Partial<Rule>): Rule => ({
  id: 1,
  category: 'factory',
  weekdays: [0],
  halfDayWeekday: null,
  effectiveFrom: '2000-01-01',
  createdBy: null,
  ...over,
})

describe('month URL state', () => {
  it('opens on the current month by default', () => {
    expect(readCalendarParams(new URLSearchParams(), TODAY)).toEqual({ view: 'month', month: '2026-11', show: 'factory', day: null })
  })

  it('reads ?month=, ?view=, ?show= and ?day=, ignoring junk', () => {
    expect(readCalendarParams(new URLSearchParams('view=year&month=2027-01&show=office&day=2027-01-15'), TODAY)).toEqual({
      view: 'year',
      month: '2027-01',
      show: 'office',
      day: '2027-01-15',
    })
    expect(readCalendarParams(new URLSearchParams('view=week&month=2026-13&day=soon'), TODAY)).toMatchObject({
      view: 'month',
      month: '2026-11',
      day: null,
    })
  })

  it('round-trips and leaves defaults out of the URL', () => {
    const p = readCalendarParams(new URLSearchParams('month=2026-12'), TODAY)
    expect(calendarParams(p, TODAY).toString()).toBe('month=2026-12')
    expect(calendarParams({ ...p, month: '2026-11' }, TODAY).toString()).toBe('')
  })
})

describe('month grid', () => {
  it('November 2026 starting Monday: 30 Oct – 6 Dec, whole weeks', () => {
    const weeks = monthMatrix('2026-11', 1)
    expect(weeks[0][0]).toEqual({ date: '2026-10-26', inMonth: false })
    expect(weeks[0][6]).toEqual({ date: '2026-11-01', inMonth: true }) // 1 Nov 2026 is a Sunday
    expect(weeks.at(-1)!.at(-1)).toEqual({ date: '2026-12-06', inMonth: false })
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('the week start is a setting', () => {
    expect(monthMatrix('2026-11', 0)[0][0]).toEqual({ date: '2026-11-01', inMonth: true })
    expect(weekdayHeader(0)[0]).toBe('Sun')
    expect(weekdayHeader(1)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })
})

describe('chips', () => {
  const pending: HolidayRequest = {
    id: 7,
    kind: 'closure',
    status: 'pending',
    name: 'Flood closure',
    dateFrom: '2026-11-24',
    dateTo: '2026-11-25',
    appliesTo: 'all',
    summary: '',
    reason: 'Road under water',
    requestedBy: 'R. Jayasuriya',
    requestedAt: '2026-11-05T00:00:00Z',
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
  }

  it('live holidays first, then requests awaiting approval; cancelled ones hidden', () => {
    const chips = chipsFor(
      '2026-11-24',
      [holiday({}), holiday({ id: 2, name: 'Office outing', type: 'closure', appliesTo: 'office' }), holiday({ id: 3, cancelled: true })],
      [pending],
    )
    expect(chips.map((c) => c.kind)).toEqual(['poya', 'category', 'pending'])
    expect(visibleChips(chips)).toMatchObject({ more: 1 })
    expect(visibleChips(chips).shown).toHaveLength(2)
  })
})

describe('category toggle shading', () => {
  // factory workers: Sunday until 15 Nov, then Sunday + Saturday; office: Sunday, half day Saturday
  const rules = [
    rule({ id: 1 }),
    rule({ id: 2, weekdays: [0, 6], effectiveFrom: '2026-11-15' }),
    rule({ id: 3, category: 'office', halfDayWeekday: 6 }),
  ]
  const outing = holiday({ id: 9, date: '2026-11-11', type: 'closure', appliesTo: 'office' })

  it('shades the chosen category’s weekly holiday in force that week', () => {
    expect(shadeFor('2026-11-08', 'factory', rules, [])).toBe('weekly') // Sunday
    expect(shadeFor('2026-11-14', 'factory', rules, [])).toBeNull() // Saturday, old rule
    expect(shadeFor('2026-11-21', 'factory', rules, [])).toBe('weekly') // Saturday, new rule
    expect(shadeFor('2026-11-21', 'office', rules, [])).toBe('half')
  })

  it('shades a category holiday only for that category', () => {
    expect(shadeFor('2026-11-11', 'office', rules, [outing])).toBe('category')
    expect(shadeFor('2026-11-11', 'factory', rules, [outing])).toBeNull()
  })
})

it('upcoming: the next 5 live holidays from today', () => {
  const list = [
    holiday({ id: 1, date: '2026-10-25' }),
    holiday({ id: 2, date: '2026-11-08' }),
    holiday({ id: 3, date: '2026-11-24' }),
    holiday({ id: 4, date: '2026-11-10', cancelled: true }),
  ]
  expect(upcoming(list, TODAY).map((h) => h.id)).toEqual([2, 3])
})
