/**
 * Pure helpers + portal-facing shapes for the Agent Dispatch module (COL-05).
 * Kept free of Nest/TypeORM so the rules (dates, freshness, status, stop ordering)
 * are unit-testable on their own.
 */

/** The factory runs on Sri Lanka time; "today" for dispatch is the factory's local date. */
export const FACTORY_TZ = 'Asia/Colombo';

/** 'YYYY-MM-DD' for `now` in the factory's time zone. */
export function localDate(now: Date, tz: string = FACTORY_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 'HH:MM' (24h) for `now` in the factory's time zone. */
export function localTime(now: Date, tz: string = FACTORY_TZ): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

/** 'YYYY-MM-DD' shifted by `days` (negative = earlier). Pure date-string arithmetic in UTC. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Does an assignment's [validFrom, validTo] window include `date`? (validTo null = open-ended) */
export function windowIncludes(
  w: { validFrom: string; validTo: string | null },
  date: string,
): boolean {
  return w.validFrom <= date && (w.validTo === null || w.validTo >= date);
}

/* ── Freshness — location is never "real-time", only "how old" ── */

export type FreshnessLevel = 'fresh' | 'recent' | 'stale' | 'none';

export const FRESH_MAX_MIN = 5;
export const RECENT_MAX_MIN = 30;

export interface Freshness {
  level: FreshnessLevel;
  /** minutes since the fix was recorded (device time); null when never seen */
  ageMin: number | null;
}

export function freshnessOf(lastSeen: Date | null, now: Date): Freshness {
  if (!lastSeen) return { level: 'none', ageMin: null };
  const ageMin = Math.max(0, (now.getTime() - lastSeen.getTime()) / 60_000);
  const level: FreshnessLevel =
    ageMin < FRESH_MAX_MIN
      ? 'fresh'
      : ageMin <= RECENT_MAX_MIN
        ? 'recent'
        : 'stale';
  return { level, ageMin: Math.round(ageMin * 10) / 10 };
}

/* ── Board status ── */

export type BoardStatus =
  | 'Not started'
  | 'On route'
  | 'Completed'
  | 'Absent'
  | 'Covering'
  | 'Not scheduled';

export interface BoardStatusInput {
  absent: boolean;
  /** has at least one route of his own scheduled that date (Route-Schedule-Addendum §5); default true */
  scheduled?: boolean;
  covering: boolean;
  shiftStarted: boolean;
  shiftEnded: boolean;
  stopsDone: number;
  stopsTotal: number;
}

/** Absent > Not scheduled > Completed > Covering > On route > Not started. */
export function boardStatusOf(i: BoardStatusInput): BoardStatus {
  if (i.absent) return 'Absent';
  if (i.scheduled === false && !i.covering) return 'Not scheduled';
  if (i.shiftEnded || (i.stopsTotal > 0 && i.stopsDone >= i.stopsTotal)) {
    return 'Completed';
  }
  if (i.covering) return 'Covering';
  if (i.shiftStarted) return 'On route';
  return 'Not started';
}

/* ── Stop ordering for route lines ── */

export interface GeoStop {
  estateId: number;
  name: string;
  lat: number;
  lng: number;
}

/**
 * The portal has no stored stop order yet, so route lines connect a route's estates by
 * greedy nearest-neighbour from the westernmost one. Good enough to draw a sensible
 * polyline; a real RouteStop sequence replaces this later.
 */
export function orderStops<T extends { lat: number; lng: number }>(
  stops: T[],
): T[] {
  if (stops.length <= 2) return [...stops];
  const remaining = [...stops].sort((a, b) => a.lng - b.lng);
  const ordered: T[] = [remaining.shift() as T];
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let best = 0;
    let bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = (s.lat - last.lat) ** 2 + (s.lng - last.lng) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    ordered.push(remaining.splice(best, 1)[0]);
  }
  return ordered;
}

/* ── Portal-facing shapes (mirrored by admin/src/features/dispatch/types.ts) ── */

export interface PublicBoardAgent {
  agentId: number;
  /** 'EMP-0012' — the agent's employee record (their history lives on /employees/:id) */
  employeeId: string;
  name: string;
  /** his own (permanent) route scheduled on the board's date — at most one (one route per agent per date) */
  routeId: number | null;
  routeName: string | null;
  /** every route he holds permanently, whatever the date */
  ownRoutes: { routeId: number; name: string }[];
  /** what he runs on the board's date: his scheduled own route and/or the route he covers */
  scheduledRoutes: { routeId: number; name: string; covering: boolean }[];
  /** set when this agent is covering another route today */
  coveringRouteId: number | null;
  coveringRouteName: string | null;
  status: BoardStatus;
  absent: boolean;
  stopsDone: number;
  stopsTotal: number;
  /** estate weight collected so far today — estate-level weighing exists by design */
  kgCollected: number;
  shiftStartedAt: string | null;
  lastSeen: string | null;
  freshness: FreshnessLevel;
  ageMin: number | null;
  position: { lat: number; lng: number } | null;
}

export interface PublicBoardRoute {
  routeId: number;
  name: string;
  /** does the route run on the board's date? When not, agent/stops are empty ("Not scheduled today"). */
  scheduled: boolean;
  /** first scheduled date strictly after the board's date */
  nextCollectionDay: string | null;
  /** who is responsible today (cover wins) */
  agentId: number | null;
  agentName: string | null;
  covered: boolean;
  /** today's stops (records) on this route: how many are done / due */
  stopsDone: number;
  stopsTotal: number;
  stops: { estateId: number; name: string; lat: number; lng: number }[];
}

/** A cover request raised today, with how it stands — drives "waiting…" and "ask the next candidate". */
export interface PublicBoardCoverRequest {
  id: number;
  routeId: number;
  routeName: string;
  agentId: number;
  agentName: string;
  status: 'PENDING' | 'DECLINED' | 'EXPIRED';
  expiresAt: string | null;
  requestedBy: string;
}

/** One row of an agent's collection history (Employee detail → Collections tab). */
export interface PublicAgentHistoryRow {
  id: string;
  date: string;
  route: string;
  /** set when this agent was COVERING this route that day (the route isn't their own) */
  coveringRoute: string | null;
  estateName: string;
  /** what the agent weighed at the estate */
  estateWeightKg: number;
  /** graded total once graded, else the estate weight */
  weightKg: number;
  graded: boolean;
  gradeLines: { grade: 'Super' | 'Normal'; weightKg: number }[];
  status: string;
}

export interface PublicMissedCheckin {
  agentId: number;
  name: string;
  routeName: string | null;
  shiftStartTime: string;
}

export interface PublicBoard {
  date: string;
  generatedAt: string;
  agents: PublicBoardAgent[];
  routes: PublicBoardRoute[];
  coverRequests: PublicBoardCoverRequest[];
  missedCheckins: PublicMissedCheckin[];
}

export interface PublicCandidate {
  agentId: number;
  name: string;
  ownRouteId: number | null;
  ownRouteName: string | null;
  /** own route is a configured neighbour of the route needing cover */
  neighbour: boolean;
  remainingStops: number;
  ownExpectedKg: number;
  coverExpectedKg: number;
  /** highest daily delivered kg in the last 30 days (soft ceiling); 0 = no history */
  ceilingKg: number;
  /** own + cover expected load exceeds the ceiling — a warning, never a block */
  overCeiling: boolean;
  /** already asked for this route today and declined / didn't answer */
  previouslyAsked: boolean;
  /** no route of his own scheduled that date — ranks first (Route-Schedule-Addendum §5) */
  free: boolean;
}

export interface PublicCoverRequest {
  id: number;
  routeId: number;
  routeName: string;
  type: 'COVER' | 'PERMANENT';
  status: string;
  validFrom: string;
  stops: number;
  expectedKg: number;
  /** "Route 7, 14 stops, ~380 kg expected" */
  summary: string;
  expiresAt: string | null;
  requestedBy: string;
}

export interface PublicAssignment {
  id: number;
  routeId: number;
  agentId: number;
  type: 'COVER' | 'PERMANENT';
  status: string;
  validFrom: string;
  validTo: string | null;
  expiresAt: string | null;
}

export const round1 = (n: number): number => Math.round(n * 10) / 10;
