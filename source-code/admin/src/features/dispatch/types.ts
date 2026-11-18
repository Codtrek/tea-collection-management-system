/*
  Agent Dispatch (COL-05) — mirrors the backend's `dispatch-map.ts` shapes byte-for-byte.
  Spec: docs/specs/Collection-Agent-Dispatch-Addendum.md (+ Route-Schedule-Addendum.md)
*/

export type BoardStatus = 'Not started' | 'On route' | 'Completed' | 'Absent' | 'Covering' | 'Not scheduled'

/** How old the last location fix is — location is never "real-time". */
export type FreshnessLevel = 'fresh' | 'recent' | 'stale' | 'none'

export interface BoardAgent {
  agentId: number
  /** 'EMP-0012' — the agent's employee record; their history lives on /employees/:id */
  employeeId: string
  name: string
  /** his own route scheduled on the board's date — at most one (one route per agent per date) */
  routeId: number | null
  routeName: string | null
  /** every route he holds permanently, whatever the date */
  ownRoutes: Array<{ routeId: number; name: string }>
  /** what he runs on the board's date: his own scheduled route and/or the route he covers */
  scheduledRoutes: Array<{ routeId: number; name: string; covering: boolean }>
  /** set when this agent is covering another route today */
  coveringRouteId: number | null
  coveringRouteName: string | null
  status: BoardStatus
  absent: boolean
  stopsDone: number
  stopsTotal: number
  /** estate-weighed kg collected so far today */
  kgCollected: number
  shiftStartedAt: string | null
  lastSeen: string | null
  freshness: FreshnessLevel
  ageMin: number | null
  position: { lat: number; lng: number } | null
}

export interface BoardRoute {
  routeId: number
  name: string
  /** does the route run on the board's date? When not: no agent, no stops ("Not scheduled today") */
  scheduled: boolean
  /** first scheduled date after the board's date */
  nextCollectionDay: string | null
  /** who is responsible today (a cover wins) */
  agentId: number | null
  agentName: string | null
  covered: boolean
  /** today's stops on this route: done / due (used to warn before a mid-route reassignment) */
  stopsDone: number
  stopsTotal: number
  stops: Array<{ estateId: number; name: string; lat: number; lng: number }>
}

/** A cover request raised today and how it stands. */
export interface BoardCoverRequest {
  id: number
  routeId: number
  routeName: string
  agentId: number
  agentName: string
  status: 'PENDING' | 'DECLINED' | 'EXPIRED'
  expiresAt: string | null
  requestedBy: string
}

export interface MissedCheckin {
  agentId: number
  name: string
  routeName: string | null
  shiftStartTime: string
}

export interface DispatchBoard {
  date: string
  generatedAt: string
  agents: BoardAgent[]
  routes: BoardRoute[]
  coverRequests: BoardCoverRequest[]
  missedCheckins: MissedCheckin[]
}

export interface CoverCandidate {
  agentId: number
  name: string
  ownRouteId: number | null
  ownRouteName: string | null
  neighbour: boolean
  remainingStops: number
  ownExpectedKg: number
  coverExpectedKg: number
  ceilingKg: number
  /** warning only — never blocks */
  overCeiling: boolean
  previouslyAsked: boolean
  /** no route of their own scheduled that day — ranked first */
  free: boolean
}

export interface RouteAssignment {
  id: number
  routeId: number
  agentId: number
  type: 'COVER' | 'PERMANENT'
  status: string
  validFrom: string
  validTo: string | null
  expiresAt: string | null
}

export interface EstateRouteAgent {
  estateId: number
  estateName: string
  selfDelivery: boolean
  routeId: number | null
  routeName: string | null
  /** does the route run on the requested date? */
  scheduled: boolean
  /** when it doesn't: the route's next collection day and who runs it then */
  nextScheduledDate: string | null
  nextAgent: { agentId: number; name: string; covering: boolean } | null
  agent: { agentId: number; name: string; covering: boolean } | null
}

/* ── Route schedule (Route-Schedule-Addendum) ── */

export type ScheduleOverrideKind = 'ADD' | 'CANCEL'

export interface ScheduleOverride {
  id: number
  date: string
  kind: ScheduleOverrideKind
  reason: string
  /** set on both halves of a moved date */
  moveGroup: string | null
  createdBy: string
}

export interface RouteSchedule {
  routeId: number
  routeName: string
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[]
  /** overrides from today on */
  overrides: ScheduleOverride[]
  /** today and the next 27 days */
  upcoming: Array<{ date: string; scheduled: boolean; override: ScheduleOverrideKind | null }>
  nextCollectionDay: string | null
}
