/*
  Agent Dispatch (COL-05) — mirrors the backend's `dispatch-map.ts` shapes byte-for-byte.
  Spec: docs/specs/Collection-Agent-Dispatch-Addendum.md
*/

export type BoardStatus = 'Not started' | 'On route' | 'Completed' | 'Absent' | 'Covering'

/** How old the last location fix is — location is never "real-time". */
export type FreshnessLevel = 'fresh' | 'recent' | 'stale' | 'none'

export interface BoardAgent {
  agentId: number
  name: string
  routeId: number | null
  routeName: string | null
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
  agent: { agentId: number; name: string; covering: boolean } | null
}
