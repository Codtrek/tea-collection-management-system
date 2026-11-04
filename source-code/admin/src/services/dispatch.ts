import { apiFetch } from '@/lib/api'
import type { CoverCandidate, DispatchBoard, EstateRouteAgent, RouteAssignment } from '@/features/dispatch/types'

/* Agent Dispatch (COL-05) — portal side. The agent's phone talks to /dispatch/me/* instead. */

export function getBoard(): Promise<DispatchBoard> {
  return apiFetch<DispatchBoard>('/dispatch/board')
}

export function getCoverCandidates(routeId: number): Promise<CoverCandidate[]> {
  return apiFetch<CoverCandidate[]>(`/dispatch/routes/${routeId}/cover-candidates`)
}

export function markAbsent(agentId: number, reason?: string): Promise<unknown> {
  return apiFetch(`/dispatch/agents/${agentId}/absence`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function markAvailable(agentId: number): Promise<unknown> {
  return apiFetch(`/dispatch/agents/${agentId}/absence`, { method: 'DELETE' })
}

export function sendCoverRequest(input: { routeId: number; agentId: number; reason?: string }): Promise<RouteAssignment> {
  return apiFetch<RouteAssignment>('/dispatch/cover-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** "today" = a one-day cover that takes effect now · "permanent" = from now on (needs Approve). */
export function reassignRoute(
  routeId: number,
  input: { agentId: number; scope: 'today' | 'permanent' },
): Promise<RouteAssignment> {
  return apiFetch<RouteAssignment>(`/dispatch/routes/${routeId}/reassign`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** COL-02: the estate's route (read-only) and who handles it on `date` — `covering` when a cover is active. */
export function getEstateRouteAgent(estateId: string, date?: string): Promise<EstateRouteAgent> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiFetch<EstateRouteAgent>(`/dispatch/estates/${estateId}/route-agent${qs}`)
}
