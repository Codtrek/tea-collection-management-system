import { formatCurrency, formatDate, formatPercent } from '@/lib/format'

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

/** The factory calendar date (`YYYY-MM-DD`, Colombo) of a timestamp. */
export function colomboDate(at: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: COLOMBO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    typeof at === 'string' ? new Date(at) : at,
  )
}

/** Minutes after which "Updated …" turns into a warning: the figures may have moved. */
export const STALE_MINUTES = 15

/** "Updated 21:49" while fresh; "Updated 47 min ago" / "Updated 2 h ago" once stale. */
export function updatedText(generatedAt: string, now: Date): { text: string; stale: boolean } {
  const min = Math.floor((now.getTime() - new Date(generatedAt).getTime()) / 60000)
  if (min < STALE_MINUTES) return { text: `Updated ${colomboTime(generatedAt)}`, stale: false }
  return { text: min < 60 ? `Updated ${min} min ago` : `Updated ${Math.floor(min / 60)} h ago`, stale: true }
}

/**
 * A change shown with its direction in words — the caller adds a drawn arrow and the colour — so it
 * is never colour-only. null when there is nothing to compare.
 */
export function trend(changePct: number | null): { word: 'up' | 'down' | 'level'; pct: string } | null {
  if (changePct === null) return null
  if (Math.abs(changePct) < 0.05) return { word: 'level', pct: '0.0%' }
  return { word: changePct > 0 ? 'up' : 'down', pct: formatPercent(Math.abs(changePct)) }
}

const SHORT_MONTH = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
const DAY = (d: string) => Number(d.slice(8, 10))

/** The report's comparison window: "1–18 Oct", or "28 Oct – 3 Nov" across a month end. */
export function windowLabel(w: { from: string; to: string }): string {
  if (w.from === w.to) return `${DAY(w.from)} ${SHORT_MONTH(w.from)}`
  if (w.from.slice(0, 7) === w.to.slice(0, 7)) return `${DAY(w.from)}–${DAY(w.to)} ${SHORT_MONTH(w.to)}`
  return `${DAY(w.from)} ${SHORT_MONTH(w.from)} – ${DAY(w.to)} ${SHORT_MONTH(w.to)}`
}

/**
 * The chart's written takeaway, read off the report's own days and change (nothing new is
 * computed): when deliveries last came in, if not lately, and how the month compares.
 */
export function intakeTakeaway(
  daily: { key: string; label: string; kg: number }[],
  changePct: number | null,
  lastMonthLabel: string,
  today: string,
): string {
  const upToToday = daily.filter((d) => d.key <= today)
  const last = [...upToToday].reverse().find((d) => d.kg > 0)
  if (!last) return 'No graded deliveries this month yet.'
  const yesterday = new Date(`${today}T00:00:00Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const parts: string[] = []
  if (last.key < yesterday.toISOString().slice(0, 10)) parts.push(`No deliveries recorded since ${last.label}.`)
  const t = trend(changePct)
  const month = lastMonthLabel.split(' ')[0]
  if (t) {
    parts.push(
      t.word === 'level'
        ? `Intake is level with the same days in ${month}.`
        : `Intake is ${t.pct} ${t.word === 'down' ? 'below' : 'above'} the same days in ${month}.`,
    )
  }
  return parts.join(' ') || `Deliveries came in up to ${last.label}.`
}

export type ActivityGroupKey = 'today' | 'yesterday' | 'earlier'

/**
 * Recent activity grouped by the factory date it happened on. `actor` is set when one person did
 * everything in the group, so the heading can say it once instead of on every row.
 */
export function activityGroups<T extends { timestamp: string; user: string }>(
  entries: T[],
  today: string,
): { key: ActivityGroupKey; title: string; entries: T[]; actor: string | null }[] {
  const y = new Date(`${today}T00:00:00Z`)
  y.setUTCDate(y.getUTCDate() - 1)
  const yesterday = y.toISOString().slice(0, 10)
  const keyOf = (e: T): ActivityGroupKey => {
    const d = colomboDate(e.timestamp)
    return d === today ? 'today' : d === yesterday ? 'yesterday' : 'earlier'
  }
  const titles: Record<ActivityGroupKey, string> = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' }
  return (['today', 'yesterday', 'earlier'] as const)
    .map((key) => {
      const list = entries.filter((e) => keyOf(e) === key)
      const users = new Set(list.map((e) => e.user))
      return { key, title: titles[key], entries: list, actor: list.length > 1 && users.size === 1 ? list[0].user : null }
    })
    .filter((g) => g.entries.length > 0)
}

/** "21:49" inside Today / Yesterday (the heading says the day); `17 Jul 2026` for Earlier. */
export function activityTime(timestamp: string, group: ActivityGroupKey): string {
  return group === 'earlier' ? formatDate(colomboDate(timestamp)) : colomboTime(timestamp)
}

/** Amounts written into stored audit text ("Issued advance Rs. 50000") shown the portal's way. */
export function amountsInText(text: string): string {
  return text.replace(/Rs\.?\s?(\d+(?:\.\d+)?)(?![\d,])/g, (_m, n: string) => formatCurrency(Number(n)))
}
