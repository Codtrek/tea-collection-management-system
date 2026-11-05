import { apiFetch } from '@/lib/api'
import type { TeamPerformance } from '@/features/performance/types'

/* Performance (Performance-Addendum) — `performance: view` (Manager, Administrator), server-enforced. */

export function getTeam(input: { month: string; span: 1 | 3; group: 'agents' | 'staff' }): Promise<TeamPerformance> {
  return apiFetch<TeamPerformance>(`/performance/team?month=${input.month}&span=${input.span}&group=${input.group}`)
}
