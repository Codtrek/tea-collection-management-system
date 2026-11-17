import { apiFetch } from '@/lib/api'
import type { DashboardSummary } from '@/features/dashboard/types'

/** The signed-in user's dashboard — the server decides every section from the role's permissions. */
export function getSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary')
}
