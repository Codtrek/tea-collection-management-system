import { describe, expect, it } from 'vitest'
import { agentLine, changeText, colomboHour, colomboTime, greetName, greeting, isRecordId, weekdayOf } from './dashboard-view'

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
})
