import { toCsv } from '@/lib/csv'
import type { LeafGroupBy, LeafGroupRow, LeafPurchaseQuery, LeafPurchaseReport, ReportGrade } from './types'

/*
  RPT-02's view state lives in the URL, so a link reproduces exactly what was on screen:
  ?month= | ?from=&to= | ?thisMonth=1, plus route / estate / grade / demo / group. Defaults stay
  out of the URL. Pure — unit-tested in leaf-purchase-view.test.ts.
*/

export interface LeafView extends LeafPurchaseQuery {
  groupBy: LeafGroupBy
  includeDemo: boolean
}

const GROUPS: LeafGroupBy[] = ['estate', 'route', 'month']
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isMonth = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
const id = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined)

/** `demoDefault`: demo rows are shown by default in local development only. */
export function readLeafView(p: URLSearchParams, demoDefault: boolean): LeafView {
  const group = p.get('group') as LeafGroupBy | null
  const grade = p.get('grade')
  const demo = p.get('demo')
  const from = p.get('from')
  const to = p.get('to')
  const view: LeafView = {
    groupBy: group && GROUPS.includes(group) ? group : 'estate',
    includeDemo: demo === '1' ? true : demo === '0' ? false : demoDefault,
    routeId: id(p.get('route')),
    estateId: id(p.get('estate')),
    grade: grade === 'super' || grade === 'normal' ? (grade as ReportGrade) : undefined,
  }
  if (p.get('thisMonth') === '1') view.thisMonth = true
  else if (isDate(from) && isDate(to) && from <= to) Object.assign(view, { from, to })
  else if (isMonth(p.get('month'))) view.month = p.get('month')!
  return view
}

export function leafViewParams(v: LeafView, demoDefault: boolean): URLSearchParams {
  const p = new URLSearchParams()
  if (v.thisMonth) p.set('thisMonth', '1')
  else if (v.from && v.to) {
    p.set('from', v.from)
    p.set('to', v.to)
  } else if (v.month) p.set('month', v.month)
  if (v.routeId !== undefined) p.set('route', String(v.routeId))
  if (v.estateId !== undefined) p.set('estate', String(v.estateId))
  if (v.grade) p.set('grade', v.grade)
  if (v.includeDemo !== demoDefault) p.set('demo', v.includeDemo ? '1' : '0')
  if (v.groupBy !== 'estate') p.set('group', v.groupBy)
  return p
}

export function leafQuery(v: LeafView): LeafPurchaseQuery {
  return {
    month: v.month,
    from: v.from,
    to: v.to,
    thisMonth: v.thisMonth,
    routeId: v.routeId,
    estateId: v.estateId,
    grade: v.grade,
    includeDemo: v.includeDemo,
    groupBy: v.groupBy,
  }
}

/** Estate Owner Payments for the month the report ends in. */
export const settlementsHref = (report: Pick<LeafPurchaseReport, 'period'>) =>
  `/estates/settlements?month=${report.period.to.slice(0, 7)}`

/* ── Export (CSV, opens in Excel) ── */

const GROUP_NAME: Record<LeafGroupBy, string> = { estate: 'Estate', route: 'Route', month: 'Month' }
const n2 = (v: number | null) => (v === null ? '' : v.toFixed(2))
const n1 = (v: number | null) => (v === null ? '' : v.toFixed(1))

/** "Route: Route 3 · Grade: Super · demo data excluded" — what the export was filtered by. */
export function leafFilterSummary(report: LeafPurchaseReport, v: LeafView): string {
  const parts: string[] = []
  const route = report.options.routes.find((r) => r.id === v.routeId)
  const estate = report.options.estates.find((e) => e.id === v.estateId)
  if (route) parts.push(`Route: ${route.name}`)
  if (estate) parts.push(`Estate: ${estate.name}`)
  if (v.grade) parts.push(`Grade: ${v.grade === 'super' ? 'Super' : 'Normal'}`)
  if (!v.includeDemo) parts.push('demo data excluded')
  return parts.length ? parts.join(' · ') : 'No filters'
}

/**
 * The table exactly as the server computed it — every row of the current grouping and the totals
 * row — with a short preamble. Plain numbers (Rs with 2 decimals, kg with 1) so Excel can sum them.
 */
export function leafPurchaseCsv(report: LeafPurchaseReport, v: LeafView): string {
  const by = report.table.groupBy
  const columns = [
    { header: GROUP_NAME[by], value: (r: LeafGroupRow) => r.name },
    ...(by === 'estate' ? [{ header: 'Route', value: (r: LeafGroupRow) => r.routeName ?? '' }] : []),
    { header: 'Deliveries', value: (r: LeafGroupRow) => r.deliveries },
    { header: 'Factory kg', value: (r: LeafGroupRow) => n1(r.factoryKg) },
    { header: 'Super kg', value: (r: LeafGroupRow) => n1(r.superKg) },
    { header: 'Normal kg', value: (r: LeafGroupRow) => n1(r.normalKg) },
    { header: 'Leaf value Rs', value: (r: LeafGroupRow) => n2(r.valueRs) },
    { header: 'Rs per kg', value: (r: LeafGroupRow) => n2(r.rsPerKg) },
    { header: 'Settled Rs', value: (r: LeafGroupRow) => n2(r.settledRs) },
    { header: 'Not yet settled Rs', value: (r: LeafGroupRow) => n2(r.unsettledRs) },
    ...(by === 'month' ? [] : [{ header: 'Change vs previous %', value: (r: LeafGroupRow) => n1(r.changePct) }]),
  ]
  const totals: LeafGroupRow = { ...report.table.totals, key: 'total', name: 'Total', routeName: '', id: null }
  const preamble = [
    'Leaf Purchase Report',
    `Period: ${report.period.label}${report.period.partial ? ' (in progress)' : ''}`,
    `Filters: ${leafFilterSummary(report, v)}`,
    'Leaf value: graded kg × the grade rate in force on each delivery date',
    '',
  ].map((line) => (/[",]/.test(line) ? `"${line.replace(/"/g, '""')}"` : line))
  return [...preamble, toCsv(columns, [...report.table.rows, totals])].join('\r\n')
}

/** "leaf-purchases-2026-10-estate.csv" */
export function leafPurchaseCsvName(report: LeafPurchaseReport): string {
  const period = report.period.month ?? `${report.period.from}_${report.period.to}`
  return `leaf-purchases-${period}-${report.table.groupBy}.csv`
}
