import { toCsv } from '@/lib/csv'
import type { CollectionGroupBy, CollectionGroupRow, CollectionReport, CollectionReportQuery, ReportGrade } from './types'

/*
  RPT-01's view state lives in the URL, so a link reproduces exactly what was on screen:
  ?month= | ?from=&to= | ?thisMonth=1, plus route / agent / estate / grade / demo / group / lastYear.
  Defaults stay out of the URL. Pure — unit-tested in collection-report-view.test.ts.
*/

export interface CollectionView extends CollectionReportQuery {
  groupBy: CollectionGroupBy
  includeDemo: boolean
  /** draw "Same period last year" on the trend */
  compareLastYear: boolean
}

const GROUPS: CollectionGroupBy[] = ['estate', 'route', 'agent', 'day']
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isMonth = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
const id = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined)

/** `demoDefault`: demo rows are shown by default in local development only. */
export function readCollectionView(p: URLSearchParams, demoDefault: boolean): CollectionView {
  const group = p.get('group') as CollectionGroupBy | null
  const grade = p.get('grade')
  const demo = p.get('demo')
  const from = p.get('from')
  const to = p.get('to')
  const view: CollectionView = {
    groupBy: group && GROUPS.includes(group) ? group : 'estate',
    includeDemo: demo === '1' ? true : demo === '0' ? false : demoDefault,
    compareLastYear: p.get('lastYear') === '1',
    routeId: id(p.get('route')),
    agentId: id(p.get('agent')),
    estateId: id(p.get('estate')),
    grade: grade === 'super' || grade === 'normal' ? (grade as ReportGrade) : undefined,
  }
  if (p.get('thisMonth') === '1') view.thisMonth = true
  else if (isDate(from) && isDate(to) && from <= to) Object.assign(view, { from, to })
  else if (isMonth(p.get('month'))) view.month = p.get('month')!
  return view
}

export function collectionViewParams(v: CollectionView, demoDefault: boolean): URLSearchParams {
  const p = new URLSearchParams()
  if (v.thisMonth) p.set('thisMonth', '1')
  else if (v.from && v.to) {
    p.set('from', v.from)
    p.set('to', v.to)
  } else if (v.month) p.set('month', v.month)
  if (v.routeId !== undefined) p.set('route', String(v.routeId))
  if (v.agentId !== undefined) p.set('agent', String(v.agentId))
  if (v.estateId !== undefined) p.set('estate', String(v.estateId))
  if (v.grade) p.set('grade', v.grade)
  if (v.includeDemo !== demoDefault) p.set('demo', v.includeDemo ? '1' : '0')
  if (v.groupBy !== 'estate') p.set('group', v.groupBy)
  if (v.compareLastYear) p.set('lastYear', '1')
  return p
}

/** What the API is asked for — the view minus page-only settings. */
export function reportQuery(v: CollectionView): CollectionReportQuery {
  return {
    month: v.month,
    from: v.from,
    to: v.to,
    thisMonth: v.thisMonth,
    routeId: v.routeId,
    agentId: v.agentId,
    estateId: v.estateId,
    grade: v.grade,
    includeDemo: v.includeDemo,
    groupBy: v.groupBy,
  }
}

/** EST-10 — the owner's timeline. */
export const estateTimelineHref = (estateId: number) => `/estates/EST-${String(estateId).padStart(4, '0')}?tab=timeline`

/** Agent performance lives on the Performance page; the report only links there. */
export const performanceHref = (month: string | null) => `/employees/performance${month ? `?month=${month}` : ''}`

const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** "+4.2%" / "−3.0%" / "+4,896.8%" / null → "—". */
export function signedPct(v: number | null, unit = '%'): string {
  if (v === null) return '—'
  if (v === 0) return `0${unit}`
  return `${v > 0 ? '+' : '−'}${oneDecimal.format(Math.abs(v))}${unit}`
}

/* ── Export (CSV, opens in Excel) ── */

const GROUP_NAME: Record<CollectionGroupBy, string> = { estate: 'Estate', route: 'Route', agent: 'Agent', day: 'Day' }
const kg1 = (v: number | null) => (v === null ? '' : v.toFixed(1))
const pct1 = (v: number | null) => (v === null ? '' : v.toFixed(1))

/** "Route: Route 3 · Grade: Super · demo data excluded" — what the export was filtered by. */
export function filterSummary(report: CollectionReport, v: CollectionView): string {
  const parts: string[] = []
  const route = report.options.routes.find((r) => r.id === v.routeId)
  const agent = report.options.agents.find((a) => a.id === v.agentId)
  const estate = report.options.estates.find((e) => e.id === v.estateId)
  if (route) parts.push(`Route: ${route.name}`)
  if (agent) parts.push(`Agent: ${agent.name}`)
  if (estate) parts.push(`Estate: ${estate.name}`)
  if (v.grade) parts.push(`Grade: ${v.grade === 'super' ? 'Super' : 'Normal'}`)
  if (!v.includeDemo) parts.push('demo data excluded')
  return parts.length ? parts.join(' · ') : 'No filters'
}

/**
 * The table exactly as the server computed it — every row of the current grouping (not just the
 * page) and the totals row — with a short preamble naming the report, period and filters.
 * Numbers are plain (one decimal, no units or separators) so Excel can sum them.
 */
export function collectionCsv(report: CollectionReport, v: CollectionView): string {
  const by = report.table.groupBy
  const columns = [
    { header: GROUP_NAME[by], value: (r: CollectionGroupRow) => r.name },
    ...(by === 'estate' ? [{ header: 'Route', value: (r: CollectionGroupRow) => r.routeName ?? '' }] : []),
    { header: 'Deliveries', value: (r: CollectionGroupRow) => r.deliveries },
    { header: 'Estate kg', value: (r: CollectionGroupRow) => kg1(r.estateKg) },
    { header: 'Factory kg', value: (r: CollectionGroupRow) => kg1(r.factoryKg) },
    { header: 'Difference %', value: (r: CollectionGroupRow) => pct1(r.diffPct) },
    { header: 'Super kg', value: (r: CollectionGroupRow) => kg1(r.superKg) },
    { header: 'Normal kg', value: (r: CollectionGroupRow) => kg1(r.normalKg) },
    { header: 'Super share %', value: (r: CollectionGroupRow) => pct1(r.superShare) },
    { header: 'Ungraded deliveries', value: (r: CollectionGroupRow) => r.ungradedDeliveries },
    { header: 'Ungraded estate kg', value: (r: CollectionGroupRow) => kg1(r.ungradedEstateKg) },
    ...(by === 'day' ? [] : [{ header: 'Change vs previous %', value: (r: CollectionGroupRow) => pct1(r.changePct) }]),
  ]
  const totals: CollectionGroupRow = { ...report.table.totals, key: 'total', name: 'Total', routeName: '', id: null }
  const preamble = [
    'Collection Report',
    `Period: ${report.period.label}${report.period.partial ? ' (in progress)' : ''}`,
    `Filters: ${filterSummary(report, v)}`,
    `Weights: factory kg = sum of grade lines of graded deliveries; tolerance ${report.tolerancePct}%`,
    '',
  ].map((line) => (/[",]/.test(line) ? `"${line.replace(/"/g, '""')}"` : line))
  return [...preamble, toCsv(columns, [...report.table.rows, totals])].join('\r\n')
}

/** "collection-report-2026-10-estate.csv" */
export function collectionCsvName(report: CollectionReport): string {
  const period = report.period.month ?? `${report.period.from}_${report.period.to}`
  return `collection-report-${period}-${report.table.groupBy}.csv`
}
