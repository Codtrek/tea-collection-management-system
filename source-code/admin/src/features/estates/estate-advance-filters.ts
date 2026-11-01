import type { BadgeTone } from '@/components/ui/StatusBadge'
import type { EstateAdvanceQuery } from '@/services/estates'
import { DATE_PRESETS, presetRange, type DatePreset } from '@/features/employees/advance-filters'
import type { EstateAdvanceRecovery } from './types'

/*
  EST-05 Estate Owner Advances (Estate-Owner-Advances-Addendum §3) — date range and filters live
  in the URL, the same presets as Salary Advances. Advances still pending deduction show whatever
  the range (the server keeps them in). Pure; tested in estate-advance-filters.test.ts.
*/

export { DATE_PRESETS }

export const ESTATE_RECOVERY_TONE: Record<EstateAdvanceRecovery, BadgeTone> = {
  'Pending deduction': 'warning',
  'Partly deducted': 'assigned',
  Deducted: 'success',
}

export const RECOVERY_STATUSES: EstateAdvanceRecovery[] = ['Pending deduction', 'Partly deducted', 'Deducted']

export interface EstateAdvanceFilters {
  preset: DatePreset
  /** used when preset = custom */
  from: string
  to: string
  search: string
  route: string
  status: EstateAdvanceRecovery | ''
  issuedBy: string
  page: number
}

const PRESETS = DATE_PRESETS.map((p) => p.value)
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export function readEstateAdvanceFilters(p: URLSearchParams): EstateAdvanceFilters {
  const preset = p.get('range') as DatePreset
  const status = p.get('status') as EstateAdvanceRecovery
  return {
    preset: PRESETS.includes(preset) ? preset : 'this-month',
    from: isDate(p.get('from')) ? p.get('from')! : '',
    to: isDate(p.get('to')) ? p.get('to')! : '',
    search: p.get('q') ?? '',
    route: p.get('route') ?? '',
    status: RECOVERY_STATUSES.includes(status) ? status : '',
    issuedBy: p.get('by') ?? '',
    page: Math.max(0, Number(p.get('page')) || 0),
  }
}

/** Only non-default values go in the URL. */
export function estateAdvanceParams(f: EstateAdvanceFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.preset !== 'this-month') p.set('range', f.preset)
  if (f.preset === 'custom') {
    if (f.from) p.set('from', f.from)
    if (f.to) p.set('to', f.to)
  }
  if (f.search) p.set('q', f.search)
  if (f.route) p.set('route', f.route)
  if (f.status) p.set('status', f.status)
  if (f.issuedBy) p.set('by', f.issuedBy)
  if (f.page > 0) p.set('page', String(f.page))
  return p
}

/** The range the filters mean today — "custom" with no dates = no limit. */
export function estateAdvanceRange(f: EstateAdvanceFilters, today: string): { from?: string; to?: string } {
  if (f.preset !== 'custom') return presetRange(f.preset, today)
  return { from: f.from || undefined, to: f.to || undefined }
}

export const ESTATE_ADVANCE_PAGE_SIZE = 25

export function estateAdvanceQuery(f: EstateAdvanceFilters, today: string): EstateAdvanceQuery {
  return {
    ...estateAdvanceRange(f, today),
    search: f.search || undefined,
    routeId: f.route && !Number.isNaN(Number(f.route)) ? Number(f.route) : undefined,
    status: f.status || undefined,
    issuedBy: f.issuedBy || undefined,
    page: f.page,
    limit: ESTATE_ADVANCE_PAGE_SIZE,
  }
}
