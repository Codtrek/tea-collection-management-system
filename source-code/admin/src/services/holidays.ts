import { apiFetch } from '@/lib/api'
import type { DeclarePreview, Holiday, HolidayChangeResult, HolidayRequest, HolidayYear } from '@/features/employees/types'

/*
  The holiday calendar (Attendance-Leave-Addendum §4). The server decides every change with the
  holiday permission matrix (`holidayCalendar` + `holidayStatutory`): a Manager's weekly holiday or
  factory-wide closure comes back `pending` (waiting for the Administrator), an emergency closure
  `review` (in force now, reviewed after).
*/

export function getYear(year: number): Promise<HolidayYear> {
  return apiFetch<HolidayYear>(`/holidays?year=${year}`)
}

/** Last year's Poya / public holiday names (dates blank) — a template for a new year. */
export function getTemplate(fromYear: number): Promise<{ name: string; type: 'poya' | 'public'; lastDate: string }[]> {
  return apiFetch(`/holidays/template?from=${fromYear}`)
}

export interface HolidayInput {
  date: string
  name: string
  type: 'poya' | 'public'
  paid?: boolean
  workAllowed?: boolean
}

export function createHoliday(input: HolidayInput): Promise<Holiday> {
  return apiFetch<Holiday>('/holidays', { method: 'POST', body: JSON.stringify(input) })
}

export function updateHoliday(id: number, input: HolidayInput): Promise<Holiday> {
  return apiFetch<Holiday>(`/holidays/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function cancelHoliday(id: number, reason?: string): Promise<void> {
  return apiFetch<void>(`/holidays/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) })
}

export function updateType(type: string, input: { paid: boolean; workAllowed: boolean }): Promise<void> {
  return apiFetch<void>(`/holidays/types/${type}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function setWeeklyRule(input: {
  category: 'factory' | 'office'
  weekdays: number[]
  halfDayWeekday: number | null
  effectiveFrom: string
}): Promise<HolidayChangeResult> {
  return apiFetch<HolidayChangeResult>('/holidays/weekly', { method: 'POST', body: JSON.stringify(input) })
}

export function setRestDay(employeeId: string, input: { weekday: number | null; effectiveFrom: string }): Promise<void> {
  return apiFetch<void>(`/holidays/rest-days/${encodeURIComponent(employeeId)}`, { method: 'POST', body: JSON.stringify(input) })
}

export interface DeclareInput {
  from: string
  to: string
  name: string
  reason: string
  paid: boolean
  appliesTo: 'all' | 'factory' | 'office'
  collectionStops: boolean
  attendance?: 'keep' | 'clear'
  /** same-day closure for all employees — in force now, the Administrator reviews it after */
  emergency?: boolean
}

export function previewDeclare(input: DeclareInput): Promise<DeclarePreview> {
  return apiFetch<DeclarePreview>('/holidays/declare/preview', { method: 'POST', body: JSON.stringify(input) })
}

export function declareHoliday(input: DeclareInput): Promise<HolidayChangeResult & { group?: string }> {
  return apiFetch('/holidays/declare', { method: 'POST', body: JSON.stringify(input) })
}

/** Requests and emergency reviews, pending first — the Administrator's "Pending approvals". */
export function listRequests(): Promise<HolidayRequest[]> {
  return apiFetch<HolidayRequest[]>('/holidays/requests')
}

/** approve (keep, for an emergency closure) or reject (revert) — a reason is always required. */
export function decideRequest(id: number, decision: 'approve' | 'reject', reason: string): Promise<HolidayRequest> {
  return apiFetch<HolidayRequest>(`/holidays/requests/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export function cancelDeclared(group: string, reason?: string): Promise<void> {
  return apiFetch<void>(`/holidays/declared/${encodeURIComponent(group)}`, { method: 'DELETE', body: JSON.stringify({ reason }) })
}
