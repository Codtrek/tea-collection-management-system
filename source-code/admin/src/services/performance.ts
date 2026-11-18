import { apiFetch } from '@/lib/api'
import type { DrillRow, EmployeePerformance, MeasureKey, PerformanceNote, TeamPerformance } from '@/features/performance/types'

/* Performance (Performance-Addendum) — `performance: view` (Manager, Administrator), server-enforced. */

export function getTeam(input: { month: string; span: 1 | 3; group: 'agents' | 'staff' }): Promise<TeamPerformance> {
  return apiFetch<TeamPerformance>(`/performance/team?month=${input.month}&span=${input.span}&group=${input.group}`)
}

/** One employee, the last 6 complete months. */
export function getEmployee(employeeId: string): Promise<EmployeePerformance> {
  return apiFetch<EmployeePerformance>(`/performance/employees/${encodeURIComponent(employeeId)}?months=6`)
}

/** The records behind one measure in one month. */
export function getDrill(employeeId: string, measure: MeasureKey, month: string): Promise<{ measure: MeasureKey; month: string; label: string; rows: DrillRow[] }> {
  return apiFetch(`/performance/employees/${encodeURIComponent(employeeId)}/drill/${measure}?month=${month}`)
}

/** A dated note from a conversation (performance: edit; audited). */
export function addNote(employeeId: string, note: string): Promise<PerformanceNote> {
  return apiFetch<PerformanceNote>(`/performance/employees/${encodeURIComponent(employeeId)}/notes`, { method: 'POST', body: JSON.stringify({ note }) })
}

export interface PerformanceDefinitions {
  tolerancePct: number
  minimums: { workingDays: number; routeDays: number; deliveries: number; routeHistoryDays: number }
  sameWithinPoints: number
  comingSoon: { key: string; label: string; reason: string }[]
}

/** The live tolerance and minimums behind "How performance is measured". */
export function getDefinitions(): Promise<PerformanceDefinitions> {
  return apiFetch<PerformanceDefinitions>('/performance/definitions')
}
