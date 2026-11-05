import type { BadgeTone } from '@/components/ui/StatusBadge'
import type { BoardAgent, BoardStatus, FreshnessLevel } from './types'

/* Board status → badge tone. Text always accompanies colour (never colour alone). */
export const BOARD_STATUS_TONE: Record<BoardStatus, BadgeTone> = {
  'Not started': 'neutral',
  'On route': 'approved',
  Completed: 'success',
  Absent: 'danger',
  Covering: 'warning',
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

/** Read a design token's current value (Leaflet draws on a canvas and needs literal colours). */
export function tokenColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
}
