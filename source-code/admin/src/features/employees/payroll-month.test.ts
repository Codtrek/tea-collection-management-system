import { describe, expect, it } from 'vitest'
import { canProcessMonth, currentMonth, monthOf, monthOptions, periodOf, readinessLabel, readMonth, shiftMonth } from './payroll-month'
import type { PayrollReadiness } from './types'

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

describe('readiness badge', () => {
  const r = (status: PayrollReadiness['status'], extra: Partial<PayrollReadiness> = {}): PayrollReadiness => ({
    status,
    blocking: 0,
    warnings: 0,
    excluded: 0,
    ...extra,
  })

  it('says "N issues to fix" instead of "Ready to process" while anything blocks', () => {
    expect(readinessLabel(r('Ready to process'))).toBe('Ready to process')
    expect(readinessLabel(r('Issues to fix', { blocking: 6 }))).toBe('6 issues to fix')
    expect(readinessLabel(r('Issues to fix', { blocking: 1 }))).toBe('1 issue to fix')
  })

  it('a month processed with exclusions says so', () => {
    expect(readinessLabel(r('Processed', { excluded: 2 }))).toBe('Processed · 2 excluded')
    expect(readinessLabel(r('Processed'))).toBe('Processed')
  })

  it('process is offered for a past month with Pending rows — issues are resolved on the process page', () => {
    expect(canProcessMonth(r('Ready to process'))).toBe(true)
    expect(canProcessMonth(r('Issues to fix', { blocking: 3 }))).toBe(true)
    expect(canProcessMonth(r('In progress'))).toBe(false)
    expect(canProcessMonth(r('Processed'))).toBe(false)
    expect(canProcessMonth(r('No payroll'))).toBe(false)
  })
})
