import type { Holiday, HolidayRequest, HolidayYear } from '@/features/employees/types'

/*
  The holiday calendar's pure logic (Attendance-Leave-Addendum §4.4) — URL state, the month
  grid, which chips a day shows and which days are shaded. No React, so it's unit-tested
  (calendar-model.test.ts). The weekly-holiday rule mirrors backend working-days.ts: the rule in
  force on a date is the latest one whose effective-from is on or before it.
*/

export type CalendarView = 'month' | 'year' | 'list'
export type Category = 'factory' | 'office'

export interface CalendarParams {
  view: CalendarView
  /** 'YYYY-MM' — the month shown (the year view shows its year) */
  month: string
  /** whose weekly / category holidays are shaded */
  show: Category
  /** the day open in the drawer, 'YYYY-MM-DD' */
  day: string | null
}

const VIEWS: CalendarView[] = ['month', 'year', 'list']
const isMonth = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
const isDay = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)

/** `?view=&month=&show=&day=` → the calendar's state; anything missing or malformed → the default (this month). */
export function readCalendarParams(params: URLSearchParams, today: string): CalendarParams {
  const view = params.get('view') as CalendarView | null
  const month = params.get('month')
  const day = params.get('day')
  return {
    view: view && VIEWS.includes(view) ? view : 'month',
    month: isMonth(month) ? month : today.slice(0, 7),
    show: params.get('show') === 'office' ? 'office' : 'factory',
    day: isDay(day) ? day : null,
  }
}

/** The calendar's state → query params, leaving the defaults out so a plain /holidays is "this month". */
export function calendarParams(p: CalendarParams, today: string): URLSearchParams {
  const out = new URLSearchParams()
  if (p.view !== 'month') out.set('view', p.view)
  if (p.month !== today.slice(0, 7)) out.set('month', p.month)
  if (p.show !== 'factory') out.set('show', p.show)
  if (p.day) out.set('day', p.day)
  return out
}

// ── dates ─────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

/** 0 = Sunday … 6 = Saturday, read in UTC so the browser's timezone never shifts a day. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

export interface GridDay {
  date: string
  /** false for the leading / trailing days of the neighbouring months */
  inMonth: boolean
}

/** The month as whole weeks (rows of 7), starting on `weekStartsOn` (0 = Sunday, 1 = Monday). */
export function monthMatrix(month: string, weekStartsOn: 0 | 1): GridDay[][] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const lead = (first.getUTCDay() - weekStartsOn + 7) % 7
  const cur = new Date(Date.UTC(y, m - 1, 1 - lead))
  const weeks: GridDay[][] = []
  while (weeks.length < 6) {
    const week: GridDay[] = []
    for (let i = 0; i < 7; i++) {
      week.push({ date: iso(cur), inMonth: cur.getUTCMonth() === m - 1 })
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    weeks.push(week)
    if (cur.getUTCMonth() !== m - 1) break
  }
  return weeks
}

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** The grid's column headers for a week start. */
export function weekdayHeader(weekStartsOn: 0 | 1): string[] {
  return Array.from({ length: 7 }, (_, i) => SHORT[(i + weekStartsOn) % 7])
}

// ── chips ─────────────────────────────────────────────────────────────────

export type ChipKind = 'poya' | 'public' | 'closure' | 'category' | 'pending'

export interface Chip {
  key: string
  kind: ChipKind
  label: string
  holiday?: Holiday
  request?: HolidayRequest
}

/** A dated holiday's chip kind: a closure for one category is a "category holiday". */
export function chipKind(h: Holiday): ChipKind {
  if (h.type === 'closure') return h.appliesTo === 'all' ? 'closure' : 'category'
  return h.type
}

/** Everything a day shows: its live holidays, then requests awaiting approval (dashed). */
export function chipsFor(date: string, holidays: Holiday[], pending: HolidayRequest[]): Chip[] {
  const live = holidays
    .filter((h) => h.date === date && !h.cancelled)
    .map((h): Chip => ({ key: `h${h.id}`, kind: chipKind(h), label: h.name, holiday: h }))
  const waiting = pending
    .filter((r) => r.kind !== 'emergency' && r.dateFrom <= date && r.dateTo >= date)
    .map((r): Chip => ({ key: `r${r.id}`, kind: 'pending', label: r.kind === 'weekly_rule' ? r.name : `${r.name} (awaiting approval)`, request: r }))
  return [...live, ...waiting]
}

/** At most `max` chips, then "+N more". */
export function visibleChips(chips: Chip[], max = 2): { shown: Chip[]; more: number } {
  return { shown: chips.slice(0, max), more: Math.max(0, chips.length - max) }
}

// ── shading ───────────────────────────────────────────────────────────────

type WeeklyRule = HolidayYear['weeklyRules'][number]

/** The category's weekly rule in force on `date` (latest effective-from on or before it). */
export function ruleInForce(rules: WeeklyRule[], category: Category, date: string): WeeklyRule | undefined {
  return rules
    .filter((r) => r.category === category && r.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

export type Shade = 'weekly' | 'half' | 'category' | null

/**
 * How a day is shaded for the chosen category: its own category holiday, its weekly holiday,
 * or its half day. A holiday for the other category doesn't shade.
 */
export function shadeFor(date: string, category: Category, rules: WeeklyRule[], holidays: Holiday[]): Shade {
  if (holidays.some((h) => h.date === date && !h.cancelled && h.type === 'closure' && h.appliesTo === category)) return 'category'
  const rule = ruleInForce(rules, category, date)
  const wd = weekdayOf(date)
  if (rule?.weekdays.includes(wd)) return 'weekly'
  if (rule?.halfDayWeekday === wd) return 'half'
  return null
}

/** The next `n` live holidays from today on (Upcoming panel). */
export function upcoming(holidays: Holiday[], today: string, n = 5): Holiday[] {
  return holidays
    .filter((h) => !h.cancelled && h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .slice(0, n)
}

/** Weekdays as text: [0, 6] → "Sunday, Saturday". */
export function dayList(days: number[]): string {
  return days.length ? days.map((d) => WEEKDAY_NAMES[d]).join(', ') : 'none'
}
