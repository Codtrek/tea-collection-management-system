import { describe, expect, it } from 'vitest'
import { currentMonth, monthOf, monthOptions, monthStatus, periodOf, readMonth, shiftMonth } from './payroll-month'
import type { PayrollRow } from './types'

const row = (status: PayrollRow['status']) => ({ status }) as PayrollRow

describe('payroll month ↔ backend period', () => {
  it('converts both ways', () => {
    expect(periodOf('2026-10')).toBe('October 2026')
    expect(monthOf('July 2026')).toBe('2026-07')
    expect(monthOf('Q2 2026')).toBeNull()
  })

  it('steps across year ends', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
  })

  it('takes the month from the factory date', () => {
    expect(currentMonth('2026-10-29')).toBe('2026-10')
  })
})

describe('?month= in the URL', () => {
  it('opens the current month when missing, malformed or in the future', () => {
    expect(readMonth(null, '2026-10')).toBe('2026-10')
    expect(readMonth('2026-13', '2026-10')).toBe('2026-10')
    expect(readMonth('2026-11', '2026-10')).toBe('2026-10')
    expect(readMonth('2026-07', '2026-10')).toBe('2026-07')
  })

  it('lists months newest first, never a future one, back to the oldest payroll (at least 12)', () => {
    const opts = monthOptions('2026-10', ['July 2026', 'March 2025'])
    expect(opts[0]).toEqual({ value: '2026-10', label: 'October 2026' })
    expect(opts.at(-1)?.value).toBe('2025-03')
    expect(monthOptions('2026-10', [])).toHaveLength(12)
  })
})

describe('monthStatus', () => {
  it('is In progress for the current month, whatever its rows', () => {
    expect(monthStatus([row('Pending')], '2026-10', '2026-10')).toBe('In progress')
    expect(monthStatus([], '2026-10', '2026-10')).toBe('In progress')
  })

  it('past months: No payroll / Ready to process / Processed', () => {
    expect(monthStatus([], '2026-09', '2026-10')).toBe('No payroll')
    expect(monthStatus([row('Processed'), row('Pending')], '2026-07', '2026-10')).toBe('Ready to process')
    expect(monthStatus([row('Processed')], '2026-06', '2026-10')).toBe('Processed')
  })
})
