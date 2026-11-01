import { describe, expect, it } from 'vitest'
import { defaultStartMonth, installmentForMonths, monthsForInstallment, planError, planLabel, previewSchedule, scheduleText } from './advance-plan'

describe('New Advance Request — repayment plan', () => {
  it('the last installment takes the remainder', () => {
    expect(previewSchedule(20000, 6000, '2026-12').map((s) => s.amount)).toEqual([6000, 6000, 6000, 2000])
  })

  it('an amount per month fills in the months, and months fill in the amount', () => {
    expect(monthsForInstallment(20000, 5000)).toBe(4)
    expect(installmentForMonths(20000, 6)).toBe(3334)
    expect(previewSchedule(20000, 3334, '2027-01').at(-1)).toEqual({ month: '2027-06', amount: 3330 })
  })

  it('previews the schedule, shortening a long one', () => {
    expect(scheduleText(previewSchedule(20000, 5000, '2026-12'))).toBe(
      'Dec 2026: Rs. 5,000 · Jan 2027: Rs. 5,000 · Feb 2027: Rs. 5,000 · Mar 2027: Rs. 5,000 · cleared Mar 2027',
    )
    expect(scheduleText(previewSchedule(20000, 3334, '2027-01'))).toBe(
      'Jan 2027: Rs. 3,334 · Feb 2027: Rs. 3,334 · … · Jun 2027: Rs. 3,330 · cleared Jun 2027',
    )
  })

  it('validates: installment ≤ advance, months ≤ the maximum', () => {
    expect(planError(20000, 5000, 6)).toBeNull()
    expect(planError(20000, 25000, 6)).toMatch(/more than the advance/)
    expect(planError(20000, 3000, 6)).toMatch(/7 months — the most allowed is 6/)
  })

  it('starts next calendar month by default; labels the plan', () => {
    expect(defaultStartMonth('2026-11')).toBe('2026-12')
    expect(defaultStartMonth('2026-12')).toBe('2027-01')
    expect(planLabel({ installment: 5000, months: 4 })).toBe('Rs. 5,000 × 4')
    expect(planLabel({ installment: 20000, months: 1 })).toBe('One deduction')
  })
})
