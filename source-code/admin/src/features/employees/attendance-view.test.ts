import { describe, expect, it } from 'vitest'
import { attendanceParams, changedRecords, markAllPresent, markProblem, readAttendanceFilters, savedMarks, unmarkedCount } from './attendance-view'

const today = '2026-11-02'
const read = (qs: string) => readAttendanceFilters(new URLSearchParams(qs), today)

describe('attendance page URL state', () => {
  it('opens on the current month and today, month tab', () => {
    expect(read('')).toMatchObject({ tab: 'month', month: '2026-11', date: '2026-11-02' })
    expect(attendanceParams(read(''), today).toString()).toBe('')
  })

  it('keeps a past month and date; refuses the future', () => {
    expect(read('month=2026-07').month).toBe('2026-07')
    expect(read('month=2026-12').month).toBe('2026-11')
    expect(read('tab=day&date=2026-11-03').date).toBe(today)
    expect(read('tab=day&date=2026-10-19').date).toBe('2026-10-19')
  })

  it('round-trips the filters', () => {
    const qs = 'tab=day&month=2026-10&date=2026-10-19&q=silva&role=Driver&route=3&unmarked=1'
    expect(attendanceParams(read(qs), today).toString()).toBe(qs)
  })
})

describe('daily entry', () => {
  const row = (id: string, more: object = {}) => ({
    employeeId: id,
    status: null,
    half: null,
    shortOut: null,
    shortBack: null,
    dayType: 'working' as const,
    workAllowed: true,
    lockedReason: null,
    ...more,
  })

  it('nobody starts as Present — only saved marks are pre-filled', () => {
    const rows = [row('EMP-1'), row('EMP-2', { status: 'Absent' })]
    expect(savedMarks(rows)).toEqual({ 'EMP-2': { status: 'Absent' } })
    expect(unmarkedCount(rows, savedMarks(rows))).toBe(1)
  })

  it('Mark All Present skips leave, locked rows and holidays, and keeps existing marks', () => {
    const rows = [
      row('EMP-1'),
      row('EMP-2', { status: 'Leave' }),
      row('EMP-3', { lockedReason: 'Approved leave' }),
      row('EMP-4', { dayType: 'poya' }),
      row('EMP-5', { status: 'Absent' }),
    ]
    const m = markAllPresent(rows, savedMarks(rows))
    expect(m).toEqual({ 'EMP-1': { status: 'Present' }, 'EMP-2': { status: 'Leave' }, 'EMP-5': { status: 'Absent' } })
    expect(unmarkedCount(rows, m)).toBe(0)
  })

  it('half-day / short leave need their details; only changes are sent', () => {
    expect(markProblem({ status: 'Half-day' })).toBe('Choose AM or PM')
    expect(markProblem({ status: 'Short leave', shortOut: '10:00', shortBack: '09:00' })).toBe('Back must be after out')
    const rows = [row('EMP-1', { status: 'Present' }), row('EMP-2')]
    expect(changedRecords(rows, { 'EMP-1': { status: 'Present' }, 'EMP-2': { status: 'Half-day', half: 'AM' } })).toEqual([
      { employeeId: 'EMP-2', status: 'Half-day', half: 'AM' },
    ])
  })
})
