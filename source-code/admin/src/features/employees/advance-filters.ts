import type { AdvanceQuery } from '@/services/employees'
import { shiftMonth } from '@/lib/month'
import type { AdvanceTab } from './types'

/*
  EMP-10 Salary Advances (Salary-Advances-Addendum) — tab, date range and filters live in the
  URL. "Needs decision" ignores the range so an old pending request is never hidden. Pure;
  tested in advance-filters.test.ts.
*/

export const ADVANCE_TABS: { id: AdvanceTab; label: string }[] = [
  { id: 'decide', label: 'Needs decision' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

export type DatePreset = 'this-month' | 'last-month' | 'last-3-months' | 'custom'

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'custom', label: 'Custom' },
]

const lastDay = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
}

/** A preset's inclusive request-date range, from the factory date `today` ('YYYY-MM-DD'). */
export function presetRange(preset: Exclude<DatePreset, 'custom'>, today: string): { from: string; to: string } {
  const month = today.slice(0, 7)
  if (preset === 'last-month') {
    const prev = shiftMonth(month, -1)
    return { from: `${prev}-01`, to: lastDay(prev) }
  }
  if (preset === 'last-3-months') return { from: `${shiftMonth(month, -2)}-01`, to: lastDay(month) }
  return { from: `${month}-01`, to: lastDay(month) }
}

export interface AdvanceFilters {
  tab: AdvanceTab
  preset: DatePreset
  /** used when preset = custom */
  from: string
  to: string
  search: string
  role: string
  route: string
  min: string
  max: string
  page: number
}

const TABS = ADVANCE_TABS.map((t) => t.id)
const PRESETS = DATE_PRESETS.map((p) => p.value)
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export function readAdvanceFilters(p: URLSearchParams): AdvanceFilters {
  const tab = p.get('tab') as AdvanceTab
  const preset = p.get('range') as DatePreset
  return {
    tab: TABS.includes(tab) ? tab : 'decide',
    preset: PRESETS.includes(preset) ? preset : 'this-month',
    from: isDate(p.get('from')) ? p.get('from')! : '',
    to: isDate(p.get('to')) ? p.get('to')! : '',
    search: p.get('q') ?? '',
    role: p.get('role') ?? '',
    route: p.get('route') ?? '',
    min: p.get('min') ?? '',
    max: p.get('max') ?? '',
    page: Math.max(0, Number(p.get('page')) || 0),
  }
}

/** Only non-default values go in the URL. */
export function advanceParams(f: AdvanceFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.tab !== 'decide') p.set('tab', f.tab)
  if (f.preset !== 'this-month') p.set('range', f.preset)
  if (f.preset === 'custom') {
    if (f.from) p.set('from', f.from)
    if (f.to) p.set('to', f.to)
  }
  if (f.search) p.set('q', f.search)
  if (f.role) p.set('role', f.role)
  if (f.route) p.set('route', f.route)
  if (f.min) p.set('min', f.min)
  if (f.max) p.set('max', f.max)
  if (f.page > 0) p.set('page', String(f.page))
  return p
}

/** The range the filters mean today — "custom" with no dates = no limit. */
export function rangeOf(f: AdvanceFilters, today: string): { from?: string; to?: string } {
  if (f.preset !== 'custom') return presetRange(f.preset, today)
  return { from: f.from || undefined, to: f.to || undefined }
}

export const ADVANCE_PAGE_SIZE = 25

export function advanceQuery(f: AdvanceFilters, today: string): AdvanceQuery {
  const num = (v: string) => (v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined)
  return {
    tab: f.tab,
    ...rangeOf(f, today),
    search: f.search || undefined,
    role: f.role || undefined,
    routeId: num(f.route),
    min: num(f.min),
    max: num(f.max),
    page: f.page,
    limit: ADVANCE_PAGE_SIZE,
  }
}
