import type { BadgeTone } from '@/components/ui/StatusBadge'
import { monthOf, monthOptionsFor } from '@/lib/month'
import type { MonthReadiness, PayrollReadiness } from './types'

/*
  Payroll by month (Payroll-Month-History-Addendum). The month ↔ period helpers live in
  lib/month.ts (shared with Payment Settlements); this adds the payroll month status. Pure — no
  React, unit-tested in payroll-month.test.ts. How payroll is calculated is unchanged.
*/

export { currentMonth, monthOf, periodOf, readMonth, shiftMonth } from '@/lib/month'

/** The picker's months, newest first: back to the earliest payroll on record, and at least 12. */
export function monthOptions(current: string, periods: string[]): { value: string; label: string }[] {
  return monthOptionsFor(
    current,
    periods.map(monthOf).filter((m): m is string => m !== null),
  )
}

/*
  The month badge (Part C). The server decides the readiness — "Ready to process" only when no
  bank-paid employee is missing bank details (payroll-view.ts); this only words and colours it.
*/
export const READINESS_TONE: Record<MonthReadiness, BadgeTone> = {
  'In progress': 'assigned',
  'Ready to process': 'warning',
  'Issues to fix': 'danger',
  Processed: 'success',
  'No payroll': 'neutral',
}

export function readinessLabel(r: PayrollReadiness): string {
  if (r.status === 'Issues to fix') return `${r.blocking} issue${r.blocking === 1 ? '' : 's'} to fix`
  if (r.status === 'Processed' && r.excluded > 0) return `Processed · ${r.excluded} excluded`
  return r.status
}

/** A past month with Pending rows can go to the process page — blocking issues are resolved there (fix, or exclude with a reason). */
export function canProcessMonth(r: PayrollReadiness): boolean {
  return r.status === 'Ready to process' || r.status === 'Issues to fix'
}
