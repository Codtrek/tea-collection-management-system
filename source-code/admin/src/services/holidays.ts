import { apiFetch } from '@/lib/api'
import type { DeclarePreview, Holiday, HolidayYear } from '@/features/employees/types'

/* The holiday calendar (Attendance-Leave-Addendum §Holidays). Changes need `holidayCalendar: edit` (server-enforced). */

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
}): Promise<void> {
  return apiFetch<void>('/holidays/weekly', { method: 'POST', body: JSON.stringify(input) })
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
}

export function previewDeclare(input: DeclareInput): Promise<DeclarePreview> {
  return apiFetch<DeclarePreview>('/holidays/declare/preview', { method: 'POST', body: JSON.stringify(input) })
}

export function declareHoliday(input: DeclareInput): Promise<{ group: string }> {
  return apiFetch<{ group: string }>('/holidays/declare', { method: 'POST', body: JSON.stringify(input) })
}

export function cancelDeclared(group: string, reason?: string): Promise<void> {
  return apiFetch<void>(`/holidays/declared/${encodeURIComponent(group)}`, { method: 'DELETE', body: JSON.stringify({ reason }) })
}
