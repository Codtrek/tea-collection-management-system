import { factoryToday } from '@/features/dispatch/status'

/*
  Month helpers shared by every month-scoped screen (Payroll, Payment Settlements). The URL
  carries `?month=YYYY-MM`; the backend keys rows by a period label ('October 2026'). Pure — no
  React — so they're unit-tested (payroll-month.test.ts, settlement-filters.test.ts).
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

/** '2026-10' → 'October 2026' — the backend's period label. */
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

export const isMonth = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

/** `?month=` → a month to show. Missing, malformed or after `latest` → `fallback` (default `latest`). */
export function readMonth(param: string | null, latest: string, fallback: string = latest): string {
  if (!isMonth(param) || param > latest) return fallback
  return param
}

/** The picker's months, newest first: from `latest` back to the earliest recorded one, and at least 12. */
export function monthOptionsFor(latest: string, months: string[]): { value: string; label: string }[] {
  const earliest = [shiftMonth(latest, -11), ...months].sort()[0]
  const out: { value: string; label: string }[] = []
  for (let m = latest; m >= earliest; m = shiftMonth(m, -1)) out.push({ value: m, label: periodOf(m) })
  return out
}
