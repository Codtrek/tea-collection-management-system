import type { CollectionGroupBy, CollectionReportQuery, ReportGrade } from './types'

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
