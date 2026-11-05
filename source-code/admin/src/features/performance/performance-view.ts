import type { Measure } from './types'

/*
  Pure helpers for the Performance pages (Performance-Addendum): the URL state and how a measure
  reads in a cell. Every percentage shows its counts; "Not enough data" is text, never a number.
*/

export type PerformanceTab = 'agents' | 'staff'

export interface PerformanceParams {
  tab: PerformanceTab
  /** 'YYYY-MM' */
  month: string
  span: 1 | 3
}

const isMonth = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

/** The last month that has fully ended — the default. */
export function lastCompleteMonth(today: string): string {
  const [y, m] = today.slice(0, 7).split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function readPerformanceParams(params: URLSearchParams, today: string): PerformanceParams {
  const month = params.get('month')
  return {
    tab: params.get('tab') === 'staff' ? 'staff' : 'agents',
    month: isMonth(month) && month <= today.slice(0, 7) ? month : lastCompleteMonth(today),
    span: params.get('span') === '3' ? 3 : 1,
  }
}

/** Defaults are left out, so a plain /employees/performance is "agents, last complete month". */
export function performanceParams(p: PerformanceParams, today: string): URLSearchParams {
  const out = new URLSearchParams()
  if (p.tab !== 'agents') out.set('tab', p.tab)
  if (p.month !== lastCompleteMonth(today)) out.set('month', p.month)
  if (p.span !== 1) out.set('span', '3')
  return out
}

export interface CellText {
  main: string
  /** a second line: counts' meaning, kg vs route, owner-side failures … */
  sub: string | null
  muted: boolean
}

const counts = (m: Measure) => (m.num !== null && m.den !== null ? ` (${m.num}/${m.den})` : '')

/** How a measure reads in a cell — always with its counts. */
export function cellText(m: Measure | undefined): CellText {
  if (!m) return { main: '—', sub: null, muted: true }
  if (m.key === 'kg') {
    const vs = m.extra?.vsRouteAverage
    return {
      main: `${(m.value ?? 0).toLocaleString('en-US')} kg`,
      sub: m.status === 'ok' && vs !== null && vs !== undefined ? `${vs}% of route average (${m.num}/${m.den} kg)` : 'Route comparison: not enough data',
      muted: false,
    }
  }
  if (m.status === 'not_enough') return { main: 'Not enough data', sub: m.reason ?? null, muted: true }
  if (m.key === 'absences' || m.key === 'leave') {
    return { main: `${m.value ?? 0} day${m.value === 1 ? '' : 's'}`, sub: null, muted: m.status === 'info' }
  }
  if (m.key === 'coverHelp' && (m.den ?? 0) === 0) return { main: 'No requests', sub: null, muted: true }
  let sub: string | null = null
  if (m.key === 'attendance' && Number(m.extra?.unmarked ?? 0) > 0) sub = `${m.extra?.unmarked} day(s) not marked`
  if (m.key === 'fertilizer') {
    const owner = Number(m.extra?.ownerSide ?? 0)
    const other = Number(m.extra?.otherFailures ?? 0)
    if (owner + other > 0) sub = `Failed: ${owner} owner-side, ${other} other`
  }
  if (m.key === 'weightAccuracy') sub = `outside ${m.extra?.tolerancePct}% tolerance`
  return { main: `${m.value}%${counts(m)}`, sub, muted: m.status === 'info' }
}

/** For sorting: the figure, with "Not enough data" last. */
export function sortValue(m: Measure | undefined): number {
  if (!m || m.status === 'not_enough') return -1
  if (m.key === 'kg') return Number(m.extra?.vsRouteAverage ?? m.value ?? -1)
  return m.value ?? -1
}
