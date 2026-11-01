import { periodOf, shiftMonth } from '@/lib/month'
import { formatCurrency } from '@/lib/format'

/*
  The New Advance Request form's repayment plan (Salary-Advances-Addendum §10): fill in months
  from an installment (and back), validate, and preview the schedule. A preview only — the server
  validates again and owns the real schedule (backend advances/installments.ts). Shared by
  salary and estate owner advances. Pure; tested in
  advance-plan.test.ts.
*/

/** Installment from a number of months — whole rupees, rounded up; the last one takes the remainder. */
export function installmentForMonths(amount: number, months: number): number {
  return Math.ceil(amount / Math.max(1, months))
}

export function monthsForInstallment(amount: number, installment: number): number {
  return Math.max(1, Math.ceil(Math.round((amount / installment) * 100) / 100))
}

/** [{ month: 'YYYY-MM', amount }] — e.g. Rs. 20,000 at Rs. 6,000 = 6,000 / 6,000 / 6,000 / 2,000 */
export function previewSchedule(amount: number, installment: number, startMonth: string): { month: string; amount: number }[] {
  const out: { month: string; amount: number }[] = []
  let left = amount
  for (let m = startMonth; left > 0 && out.length < 120; m = shiftMonth(m, 1)) {
    const take = Math.min(installment, left)
    out.push({ month: m, amount: take })
    left = Math.round((left - take) * 100) / 100
  }
  return out
}

const short = (month: string) => {
  const [name, year] = periodOf(month).split(' ')
  return `${name.slice(0, 3)} ${year}`
}

/** "Dec 2026: Rs. 5,000 · Jan 2027: Rs. 5,000 · … · cleared Mar 2027" */
export function scheduleText(schedule: { month: string; amount: number }[]): string {
  if (schedule.length === 0) return ''
  const shown = schedule.length > 4 ? [...schedule.slice(0, 2), null, schedule[schedule.length - 1]] : schedule
  const parts = shown.map((s) => (s ? `${short(s.month)}: ${formatCurrency(s.amount)}` : '…'))
  return `${parts.join(' · ')} · cleared ${short(schedule[schedule.length - 1].month)}`
}

/** null when the plan is valid, else what's wrong. */
export function planError(amount: number, installment: number, maxMonths: number): string | null {
  if (!(amount > 0)) return null
  if (!(installment > 0)) return 'Enter an installment above Rs. 0'
  if (installment > amount) return 'The installment can’t be more than the advance'
  const months = monthsForInstallment(amount, installment)
  if (months > maxMonths) return `That plan runs ${months} months — the most allowed is ${maxMonths}`
  return null
}

/** The default start month: the next calendar month. */
export function defaultStartMonth(currentMonth: string): string {
  return shiftMonth(currentMonth, 1)
}

/** "Rs. 5,000 × 4" — or "One deduction" */
export function planLabel(plan: { installment: number; months: number }): string {
  return plan.months <= 1 ? 'One deduction' : `${formatCurrency(plan.installment)} × ${plan.months}`
}

export interface PlanValue {
  mode: 'single' | 'installments'
  /** typed as text so a half-typed number isn't lost */
  installment: string
  months: string
  /** 'YYYY-MM' */
  startMonth: string
}

/** The installment the plan resolves to — the whole amount for one deduction. */
export function planInstallment(amount: number, v: PlanValue): number {
  return v.mode === 'single' ? amount : Number(v.installment)
}

/** null when valid. */
export function planValueError(amount: number, v: PlanValue, maxMonths: number): string | null {
  return v.mode === 'single' ? null : planError(amount, Number(v.installment), maxMonths)
}

