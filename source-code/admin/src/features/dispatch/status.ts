import type { BadgeTone } from '@/components/ui/StatusBadge'
import type { BoardAgent, BoardStatus, FreshnessLevel } from './types'

/* Board status → badge tone. Text always accompanies colour (never colour alone). */
export const BOARD_STATUS_TONE: Record<BoardStatus, BadgeTone> = {
  'Not started': 'neutral',
  'On route': 'approved',
  Completed: 'success',
  Absent: 'danger',
  Covering: 'warning',
  'Not scheduled': 'neutral',
}

/** CSS custom-property name (without `--color-`) for each freshness level's dot. */
export const FRESHNESS_TOKEN: Record<FreshnessLevel, string> = {
  fresh: 'success-fg',
  recent: 'warning-fg',
  stale: 'text-muted',
  none: 'border-strong',
}

const timeOfDay = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/**
 * Location is never "real-time" — say how old the fix is.
 *  < 5 min  → "3 min ago"  (green) · 5–30 min → "12 min ago" (amber) · older → "Last seen 08:14" (grey)
 */
export function freshnessLabel(agent: Pick<BoardAgent, 'freshness' | 'ageMin' | 'lastSeen'>): string {
  if (agent.freshness === 'none' || !agent.lastSeen) return 'No location yet'
  if (agent.freshness === 'stale') return `Last seen ${timeOfDay(agent.lastSeen)}`
  const min = Math.max(0, Math.round(agent.ageMin ?? 0))
  return min < 1 ? 'Just now' : `${min} min ago`
}

/** One-line form for the board table ("11:16", "8 min ago", "No location"); the full label is its tooltip. */
export function freshnessShort(agent: Pick<BoardAgent, 'freshness' | 'ageMin' | 'lastSeen'>): string {
  if (agent.freshness === 'none' || !agent.lastSeen) return 'No location'
  if (agent.freshness === 'stale') return timeOfDay(agent.lastSeen)
  return freshnessLabel(agent)
}

/**
 * The board's Route cell, minus the badges: the agent's permanent routes that don't run on the
 * board's date. "Also holds" only when a route shows above it; "Holds" when none runs that day
 * (the Status column already says "Not scheduled" — never repeated here).
 */
export function otherRoutesNote(agent: Pick<BoardAgent, 'ownRoutes' | 'scheduledRoutes'>): string | null {
  const runningIds = new Set(agent.scheduledRoutes.map((r) => r.routeId))
  const others = agent.ownRoutes.filter((r) => !runningIds.has(r.routeId)).map((r) => r.name)
  if (others.length === 0) return agent.scheduledRoutes.length === 0 ? 'Unassigned' : null
  return `${agent.scheduledRoutes.length > 0 ? 'Also holds' : 'Holds:'} ${others.join(', ')}`
}

/** Read a design token's current value (Leaflet draws on a canvas and needs literal colours). */
export function tokenColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
}

/** The factory's calendar date (Sri Lanka), 'YYYY-MM-DD' — what the server calls "today". */
export function factoryToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** 0 = Sunday … 6 = Saturday — the backend's weekday numbering for route schedules. */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Weekday of a 'YYYY-MM-DD' date, read in UTC so it never shifts with the browser's zone. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}
