import { describe, expect, it } from 'vitest'
import {
  activityGroups,
  activityTime,
  agentLine,
  amountsInText,
  changeText,
  colomboDate,
  colomboHour,
  colomboTime,
  greetName,
  greeting,
  intakeTakeaway,
  isRecordId,
  trend,
  updatedText,
  weekdayOf,
  windowLabel,
} from './dashboard-view'

describe('dashboard display helpers', () => {
  it('time of day is Colombo’s (UTC+5:30)', () => {
    expect(colomboHour(new Date('2026-11-17T04:00:00Z'))).toBe(9)
    expect(greeting(new Date('2026-11-17T04:00:00Z'))).toBe('Good morning')
    expect(greeting(new Date('2026-11-17T08:00:00Z'))).toBe('Good afternoon')
    expect(greeting(new Date('2026-11-17T13:00:00Z'))).toBe('Good evening')
    expect(colomboTime('2026-11-17T08:35:00Z')).toBe('14:05')
  })

  it('weekday of a factory date', () => {
    expect(weekdayOf('2026-11-17')).toBe('Tuesday')
  })

  it('greets the first word that is not an initial', () => {
    expect(greetName('A. Bandara')).toBe('Bandara')
    expect(greetName('Hasindu Rodrigo')).toBe('Hasindu')
    expect(greetName('S. K. Fernando')).toBe('Fernando')
    expect(greetName('A. B.')).toBe('A. B.')
  })

  it('a change, or why there is none', () => {
    expect(changeText(12.5, 'vs last week', 100)).toBe('+12.5% vs last week')
    expect(changeText(-3, 'vs last week', 100)).toBe('-3.0% vs last week')
    expect(changeText(null, 'vs last week', null)).toBe('Nothing to compare with last week')
  })

  it('only real IDs get the ID face', () => {
    expect(isRecordId('EADV-2026-0031')).toBe(true)
    expect(isRecordId('FB-2291')).toBe(true)
    expect(isRecordId('July 2026')).toBe(false)
    expect(isRecordId('1 settlement(s) · July 2026')).toBe(false)
  })

  it('agents: zeros left out, null when nobody is out', () => {
    expect(agentLine({ onRoute: 2, notStarted: 0, absent: 1, covering: 1, completed: 0 })).toBe('2 on route · 1 absent · 1 covering')
    expect(agentLine({ onRoute: 0, notStarted: 0, absent: 0, covering: 0, completed: 0 })).toBeNull()
  })

  it('"Updated": the time while fresh, how long ago (a warning) after 15 minutes', () => {
    const at = '2026-11-18T16:19:00Z' // 21:49 Colombo
    expect(updatedText(at, new Date('2026-11-18T16:30:00Z'))).toEqual({ text: 'Updated 21:49', stale: false })
    expect(updatedText(at, new Date('2026-11-18T17:06:00Z'))).toEqual({ text: 'Updated 47 min ago', stale: true })
    expect(updatedText(at, new Date('2026-11-18T18:30:00Z'))).toEqual({ text: 'Updated 2 h ago', stale: true })
  })

  it('a change says its direction in words, never only a colour', () => {
    expect(trend(-69.4)).toEqual({ word: 'down', pct: '69.4%' })
    expect(trend(12)).toEqual({ word: 'up', pct: '12.0%' })
    expect(trend(0)).toEqual({ word: 'level', pct: '0.0%' })
    expect(trend(null)).toBeNull()
  })

  it('the comparison window, as the report states it', () => {
    expect(windowLabel({ from: '2026-10-01', to: '2026-10-18' })).toBe('1–18 Oct')
    expect(windowLabel({ from: '2026-10-28', to: '2026-11-03' })).toBe('28 Oct – 3 Nov')
    expect(windowLabel({ from: '2026-10-05', to: '2026-10-05' })).toBe('5 Oct')
  })

  it('the chart takeaway: when deliveries stopped, and the report’s own change', () => {
    const daily = [
      { key: '2026-11-01', label: '1 Nov', kg: 0 },
      { key: '2026-11-02', label: '2 Nov', kg: 314.2 },
      { key: '2026-11-05', label: '5 Nov', kg: 190.4 },
    ]
    expect(intakeTakeaway(daily, -69.4, 'October 2026', '2026-11-18')).toBe(
      'No deliveries recorded since 5 Nov. Intake is 69.4% below the same days in October.',
    )
    // deliveries came in yesterday: nothing to warn about, only the comparison
    expect(intakeTakeaway(daily, 4, 'October 2026', '2026-11-06')).toBe('Intake is 4.0% above the same days in October.')
    expect(intakeTakeaway([{ key: '2026-11-01', label: '1 Nov', kg: 0 }], null, 'October 2026', '2026-11-18')).toBe(
      'No graded deliveries this month yet.',
    )
  })

  it('activity grouped by the Colombo date; one actor named once', () => {
    const e = (timestamp: string, user: string) => ({ timestamp, user })
    const groups = activityGroups(
      [e('2026-11-18T16:19:00Z', 'A. Bandara'), e('2026-11-18T10:00:00Z', 'A. Bandara'), e('2026-11-17T17:19:00Z', 'S. Fernando'), e('2026-07-15T06:00:00Z', 'S. Fernando')],
      '2026-11-18',
    )
    expect(groups.map((g) => [g.title, g.entries.length, g.actor])).toEqual([
      ['Today', 2, 'A. Bandara'],
      ['Yesterday', 1, null],
      ['Earlier', 1, null],
    ])
    // 18:30 UTC on the 17th is already the 18th in Colombo
    expect(colomboDate('2026-11-17T18:30:00Z')).toBe('2026-11-18')
    expect(activityTime('2026-11-17T17:19:00Z', 'yesterday')).toBe('22:49')
    expect(activityTime('2026-07-15T06:00:00Z', 'earlier')).toBe('15 Jul 2026')
  })

  it('amounts in stored audit text are shown the portal’s way', () => {
    expect(amountsInText('Issued advance Rs. 50000')).toBe('Issued advance Rs. 50,000')
    expect(amountsInText('Paid Rs.1234.5 to owner')).toBe('Paid Rs. 1,234.50 to owner')
    expect(amountsInText('Rs. 1,000 already formatted')).toBe('Rs. 1,000 already formatted')
  })
})
