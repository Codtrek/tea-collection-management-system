import type { BadgeTone } from '@/components/ui/StatusBadge'
import { factoryToday } from '@/features/dispatch/status'
import type { PayrollRow } from './types'

/*
  Payroll by month (Payroll-Month-History-Addendum). The URL carries `?month=YYYY-MM`; the
  backend keys payroll rows by a period label ('October 2026'). Pure helpers — no React, so
  they're unit-tested in payroll-month.test.ts. How payroll is calculated is unchanged.
*/

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** The factory's current month, 'YYYY-MM' (Sri Lanka calendar, like the rest of the portal). */
export function currentMonth(today: string = factoryToday()): string {
  return today.slice(0, 7)
}

/** '2026-10' → 'October 2026' — the backend's payroll period. */
export function periodOf(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

/** 'October 2026' → '2026-10'; null for anything else. */
export function monthOf(period: string): string | null {
  const match = /^([A-Za-z]+) (\d{4})$/.exec(period.trim())
  if (!match) return null
  const i = MONTH_NAMES.indexOf(match[1])
  return i === -1 ? null : `${match[2]}-${String(i + 1).padStart(2, '0')}`
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** `?month=` → a month to show. Missing, malformed or future → the current month. */
export function readMonth(param: string | null, current: string): string {
  if (!param || !/^\d{4}-(0[1-9]|1[0-2])$/.test(param) || param > current) return current
  return param
}

/** The picker's months, newest first: back to the earliest payroll on record, and at least 12. */
export function monthOptions(current: string, periods: string[]): { value: string; label: string }[] {
  const recorded = periods.map(monthOf).filter((m): m is string => m !== null)
  const earliest = [shiftMonth(current, -11), ...recorded].sort()[0]
  const out: { value: string; label: string }[] = []
  for (let m = current; m >= earliest; m = shiftMonth(m, -1)) out.push({ value: m, label: periodOf(m) })
  return out
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
