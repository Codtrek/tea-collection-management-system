import { isMonth } from '@/lib/month'
import type { AttendanceCode, AttendanceDayRow, AttendanceStatus, DayType } from './types'

/*
  Attendance (Attendance-Leave-Addendum Phase 1) — the grid's codes and colours, and the page's
  URL state (?tab=month|day, ?month=YYYY-MM, ?date=YYYY-MM-DD, filters). Pure; tested in
  attendance-view.test.ts. Token classes only.
*/

export const CODE_LABEL: Record<AttendanceCode, string> = {
  P: 'Present',
  A: 'Absent',
  L: 'Leave',
  H: 'Half-day',
  S: 'Short leave',
  W: 'Worked on holiday',
}

export const CODE_CLASS: Record<AttendanceCode, string> = {
  P: 'bg-success-bg text-success-fg',
  A: 'bg-danger-bg text-danger-fg',
  L: 'bg-warning-bg text-warning-fg',
  H: 'bg-brand-soft text-primary',
  S: 'bg-approved-bg text-approved-fg',
  W: 'bg-assigned-bg text-assigned-fg',
}

/** the short label on a non-working day's column */
export const DAY_TAG: Partial<Record<DayType, string>> = {
  weekly: 'Weekly',
  rest: 'Rest',
  poya: 'Poya',
  public: 'Public',
  closure: 'Closure',
  half: '½ day',
}

export const isNonWorking = (t: DayType) => t !== 'working' && t !== 'half'

export type AttendanceTab = 'month' | 'day'

export interface AttendanceFilters {
  tab: AttendanceTab
  month: string
  date: string
  search: string
  role: string
  route: string
  unmarked: boolean
}

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** The URL → filters. The month defaults to the current one; the day to today; never the future. */
export function readAttendanceFilters(p: URLSearchParams, today: string): AttendanceFilters {
  const thisMonth = today.slice(0, 7)
  const m = p.get('month')
  const d = p.get('date')
  return {
    tab: p.get('tab') === 'day' ? 'day' : 'month',
    month: isMonth(m) && m <= thisMonth ? m : thisMonth,
    date: isDate(d) && d <= today ? d : today,
    search: p.get('q') ?? '',
    role: p.get('role') ?? '',
    route: p.get('route') ?? '',
    unmarked: p.get('unmarked') === '1',
  }
}

/** Filters → URL: only what isn't the default. */
export function attendanceParams(f: AttendanceFilters, today: string): URLSearchParams {
  const p = new URLSearchParams()
  if (f.tab === 'day') p.set('tab', 'day')
  if (f.month !== today.slice(0, 7)) p.set('month', f.month)
  if (f.tab === 'day' && f.date !== today) p.set('date', f.date)
  if (f.search) p.set('q', f.search)
  if (f.role) p.set('role', f.role)
  if (f.route) p.set('route', f.route)
  if (f.unmarked) p.set('unmarked', '1')
  return p
}

/* ── Daily entry (no default selection) ───────────────────────────────── */

export interface EntryMark {
  status: AttendanceStatus
  half?: 'AM' | 'PM'
  shortOut?: string
  shortBack?: string
}

type EntryRow = Pick<AttendanceDayRow, 'employeeId' | 'status' | 'half' | 'shortOut' | 'shortBack' | 'dayType' | 'workAllowed' | 'lockedReason'>

/** What's already saved for the date — the starting marks. Nobody defaults to Present. */
export function savedMarks(rows: EntryRow[]): Record<string, EntryMark> {
  const out: Record<string, EntryMark> = {}
  for (const r of rows) {
    if (!r.status) continue
    out[r.employeeId] = {
      status: r.status,
      ...(r.half ? { half: r.half } : {}),
      ...(r.shortOut ? { shortOut: r.shortOut } : {}),
      ...(r.shortBack ? { shortBack: r.shortBack } : {}),
    }
  }
  return out
}

/** "Mark All Present": every unlocked working-day row with no mark yet — never one on leave or a holiday. */
export function markAllPresent(rows: EntryRow[], marks: Record<string, EntryMark>): Record<string, EntryMark> {
  const next = { ...marks }
  for (const r of rows) {
    if (r.lockedReason || isNonWorking(r.dayType) || next[r.employeeId]?.status === 'Leave') continue
    if (!next[r.employeeId]) next[r.employeeId] = { status: 'Present' }
  }
  return next
}

/** Rows that still need a status (locked rows don't count). */
export function unmarkedCount(rows: EntryRow[], marks: Record<string, EntryMark>): number {
  return rows.filter((r) => !r.lockedReason && !marks[r.employeeId] && !isNonWorking(r.dayType)).length
}

/** A mark that's missing its half / times — Save stays disabled. */
export function markProblem(m: EntryMark): string | null {
  if (m.status === 'Half-day' && !m.half) return 'Choose AM or PM'
  if (m.status === 'Short leave') {
    if (!m.shortOut || !m.shortBack) return 'Enter the time out and back'
    if (m.shortBack <= m.shortOut) return 'Back must be after out'
  }
  return null
}

/** Only rows that changed from what's saved (and aren't locked) are sent. */
export function changedRecords(rows: EntryRow[], marks: Record<string, EntryMark>) {
  const saved = savedMarks(rows)
  return rows
    .filter((r) => !r.lockedReason && marks[r.employeeId])
    .filter((r) => JSON.stringify(marks[r.employeeId]) !== JSON.stringify(saved[r.employeeId]))
    .map((r) => ({ employeeId: r.employeeId, ...marks[r.employeeId] }))
}
