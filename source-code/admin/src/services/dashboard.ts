import { apiFetch } from '@/lib/api'
import type { DashboardSummary, Section } from '@/features/dashboard/types'

/**
 * Every top-level key of GET /dashboard/summary, in order — the same list as the backend's
 * `DASHBOARD_SUMMARY_KEYS` (backend/src/dashboard/dashboard.service.ts). Both sides test against
 * it, so a field added or removed on one side fails a test instead of crashing the page.
 */
export const DASHBOARD_SUMMARY_KEYS = [
  'generatedAt',
  'today',
  'month',
  'role',
  'actions',
  'primaryAction',
  'toDecide',
  'todayView',
  'monthView',
  'charts',
  'activity',
  'errors',
] as const satisfies readonly (keyof DashboardSummary)[]

export const MISSING_SECTION = "The server didn't send this section."

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * The response as the page may rely on it. A required list that is missing or the wrong type
 * becomes an empty list plus an inline error for its block; a section that isn't an object is
 * `null` (not shown) and, when the role should have had it, an inline error. Never throws for a
 * partial response — only when there is no response object at all.
 */
export function parseSummary(json: unknown): DashboardSummary {
  if (!isObject(json)) throw new Error('The dashboard response was empty.')
  const errors: Partial<Record<Section, string>> = isObject(json.errors) ? { ...(json.errors as Partial<Record<Section, string>>) } : {}
  const list = <T>(v: unknown, section: Section): T[] => {
    if (Array.isArray(v)) return v as T[]
    errors[section] ??= MISSING_SECTION
    return []
  }
  // a section the server omitted entirely (undefined) was meant to be there; null means "not for this role"
  const section = <T>(v: unknown, name: Section): T | null => {
    if (isObject(v)) return v as T
    if (v === undefined) errors[name] ??= MISSING_SECTION
    return null
  }
  const primary = json.primaryAction
  return {
    generatedAt: typeof json.generatedAt === 'string' ? json.generatedAt : new Date().toISOString(),
    today: typeof json.today === 'string' ? json.today : '',
    month: typeof json.month === 'string' ? json.month : '',
    role: json.role as DashboardSummary['role'],
    actions: list(json.actions, 'actions'),
    primaryAction: isObject(primary) && typeof primary.href === 'string' ? (primary as DashboardSummary['primaryAction']) : null,
    toDecide: typeof json.toDecide === 'number' ? json.toDecide : 0,
    todayView: section(json.todayView, 'today'),
    monthView: section(json.monthView, 'month'),
    charts: section(json.charts, 'charts'),
    activity: list(json.activity, 'activity'),
    errors,
  }
}

/** The signed-in user's dashboard — the server decides every section from the role's permissions. */
export async function getSummary(): Promise<DashboardSummary> {
  return parseSummary(await apiFetch<unknown>('/dashboard/summary'))
}
