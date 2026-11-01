import type { BadgeTone } from '@/components/ui/StatusBadge'
import { monthOf, monthOptionsFor } from '@/lib/month'
import type { PayrollRow } from './types'

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

export type MonthStatus = 'In progress' | 'Ready to process' | 'Processed' | 'No payroll'

export const MONTH_STATUS_TONE: Record<MonthStatus, BadgeTone> = {
  'In progress': 'assigned',
  'Ready to process': 'warning',
  Processed: 'success',
  'No payroll': 'neutral',
}

/**
 * The current month is "In progress" until it ends (it can be generated, not processed). A past
 * month is "Processed" once every row is, "Ready to process" while any row is still Pending.
 */
export function monthStatus(rows: PayrollRow[], month: string, current: string): MonthStatus {
  if (month === current) return 'In progress'
  if (rows.length === 0) return 'No payroll'
  return rows.every((r) => r.status === 'Processed') ? 'Processed' : 'Ready to process'
}
