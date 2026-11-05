import { apiFetch } from '@/lib/api'
import type {
  CoverCandidate,
  DispatchBoard,
  EstateRouteAgent,
  RouteAssignment,
  RouteSchedule,
  ScheduleOverrideKind,
} from '@/features/dispatch/types'

/* Agent Dispatch (COL-05) — portal side. The agent's phone talks to /dispatch/me/* instead. */

/** The board for `date` (YYYY-MM-DD, default today on the server). */
export function getBoard(date?: string): Promise<DispatchBoard> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiFetch<DispatchBoard>(`/dispatch/board${qs}`)
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

/* ── Route schedule (Route-Schedule-Addendum §6) ── */

export function getRouteSchedule(routeId: number): Promise<RouteSchedule> {
  return apiFetch<RouteSchedule>(`/dispatch/routes/${routeId}/schedule`)
}

/** Needs dispatch = Approve. 0 = Sunday … 6 = Saturday. */
export function setRouteWeekdays(routeId: number, weekdays: number[]): Promise<RouteSchedule> {
  return apiFetch<RouteSchedule>(`/dispatch/routes/${routeId}/schedule/weekdays`, {
    method: 'PUT',
    body: JSON.stringify({ weekdays }),
  })
}

export function addScheduleOverride(
  routeId: number,
  input: { date: string; kind: ScheduleOverrideKind; reason: string },
): Promise<RouteSchedule> {
  return apiFetch<RouteSchedule>(`/dispatch/routes/${routeId}/schedule/overrides`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function moveScheduleDate(
  routeId: number,
  input: { fromDate: string; toDate: string; reason: string },
): Promise<RouteSchedule> {
  return apiFetch<RouteSchedule>(`/dispatch/routes/${routeId}/schedule/move`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Removes the override (both halves of a moved date). */
export function removeScheduleOverride(routeId: number, overrideId: number): Promise<RouteSchedule> {
  return apiFetch<RouteSchedule>(`/dispatch/routes/${routeId}/schedule/overrides/${overrideId}`, {
    method: 'DELETE',
  })
}
