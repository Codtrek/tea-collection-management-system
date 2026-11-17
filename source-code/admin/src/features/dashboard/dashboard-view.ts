import { formatPercent } from '@/lib/format'

/*
  Dashboard display helpers (Dashboard-Addendum). They format figures the server sent; none of
  them calculates one. Pure; tested in dashboard-view.test.ts.
*/

const COLOMBO = 'Asia/Colombo'

/** Hour of day in the factory's time zone (0–23). */
export function colomboHour(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: COLOMBO, hour: '2-digit', hourCycle: 'h23' }).format(now))
}

/** `14:05` in Colombo — the "Updated" time. */
export function colomboTime(at: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: COLOMBO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    typeof at === 'string' ? new Date(at) : at,
  )
}

/** `Tuesday` for a factory date `YYYY-MM-DD`. */
export function weekdayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
}

export function greeting(now: Date = new Date()): string {
  const h = colomboHour(now)
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/**
 * The name to greet: the first word that isn't an initial ("A. Bandara" → "Bandara",
 * "Hasindu Rodrigo" → "Hasindu"); the whole name if every word is an initial.
 */
export function greetName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  return words.find((w) => !/^[A-Za-z]\.?$/.test(w) && !w.endsWith('.')) ?? fullName.trim()
}

/** `+12.5% vs Tue 10 Nov` — or why there is no comparison (no deliveries then). */
export function changeText(changePct: number | null, against: string, compareKg: number | null): string {
  if (compareKg === null) return `Nothing to compare ${against.replace(/^vs /, 'with ')}`
  if (changePct === null) return `— ${against}`
  return `${formatPercent(changePct, true)} ${against}`
}

/** A record reference that is an ID (`EADV-2026-0031`, `FB-2291`) — set in the ID face; prose isn't. */
export function isRecordId(record: string): boolean {
  return /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/.test(record.trim())
}

/** "2 on route · 1 not started · 1 absent · 1 covering" — zeros left out; null when nobody is scheduled. */
export function agentLine(a: { onRoute: number; notStarted: number; absent: number; covering: number; completed: number }): string | null {
  const parts = [
    [a.onRoute, 'on route'],
    [a.notStarted, 'not started'],
    [a.absent, 'absent'],
    [a.covering, 'covering'],
    [a.completed, 'completed'],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, l]) => `${n} ${l}`)
  return parts.length ? parts.join(' · ') : null
}
