import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Building2, Layers, Loader2, Scale, Truck, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import {
  DonutChartCard,
  HorizontalBarChartCard,
  StackedBarChartCard,
  TrendChartCard,
} from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { SummaryCard } from '@/components/data/SummaryCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { MonthPicker } from '@/components/patterns/MonthPicker'
import { Button } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { Toggle } from '@/components/ui/Toggle'
import * as reportsService from '@/services/reports'
import { currentMonth, monthOptionsFor, shiftMonth } from '@/lib/month'
import { formatDate, formatKg, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/csv'
import {
  collectionCsv,
  collectionCsvName,
  collectionViewParams,
  estateTimelineHref,
  filterSummary,
  performanceHref,
  readCollectionView,
  reportQuery,
  signedPct,
  type CollectionView,
} from './collection-report-view'
import type { CollectionGroupBy, CollectionGroupRow, CollectionReport } from './types'

const DEMO_DEFAULT = import.meta.env.DEV

const GROUP_TABS: { id: CollectionGroupBy; label: string }[] = [
  { id: 'estate', label: 'Estate' },
  { id: 'route', label: 'Route' },
  { id: 'agent', label: 'Agent' },
  { id: 'day', label: 'Day' },
]

/*
  RPT-01 — how much leaf came in, from where, of what quality, and how that compares with earlier
  periods (Reports-Collection-Addendum). Every figure comes from `GET /reports/collection`; this
  page never recomputes one. The whole view lives in the URL. Agent performance is not judged
  here — agent rows link to the Performance page.
*/
export function CollectionReportPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = readCollectionView(params, DEMO_DEFAULT)
  const setView = (patch: Partial<CollectionView>) =>
    setParams(collectionViewParams({ ...view, ...patch }, DEMO_DEFAULT), { replace: true })
  const setPeriod = (p: Pick<CollectionView, 'month' | 'from' | 'to' | 'thisMonth'>) =>
    setView({ month: undefined, from: undefined, to: undefined, thisMonth: undefined, ...p })
  const tableRef = useRef<HTMLDivElement>(null)
  // while printing, the table shows every row (the print layout has no pager)
  const [printing, setPrinting] = useState(false)

  const query = reportQuery(view)
  const {
    data: report,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'collection', query],
    queryFn: () => reportsService.getCollectionReport(query),
    placeholderData: keepPreviousData,
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !report) {
    return (
      <ErrorState
        title="Couldn't load the collection report"
        description="Something went wrong fetching collection data."
        onRetry={() => void refetch()}
      />
    )
  }

  const thisMonth = currentMonth(report.today)
  const lastComplete = shiftMonth(thisMonth, -1)
  const monthOptions = monthOptionsFor(thisMonth, report.monthsWithData).map((o) =>
    o.value === thisMonth ? { ...o, label: `${o.label} so far` } : o,
  )
  const periodMode = view.thisMonth ? 'thisMonth' : view.from ? 'custom' : 'month'
  const filtered = view.routeId !== undefined || view.agentId !== undefined || view.estateId !== undefined || !!view.grade
  const print = () => {
    flushSync(() => setPrinting(true))
    window.print()
    setPrinting(false)
  }
  const showAll = () => {
    setView({ groupBy: 'estate' })
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <PageHeader
        title="Collection Reports"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Collection' }]}
        description="How much leaf came in, from where and of what quality. Graded deliveries count by factory weight (the sum of the grade lines); ungraded deliveries and provisional entries are shown separately."
        actions={
          <Link to={performanceHref(report.period.month)} className="text-sm font-medium text-primary hover:underline">
            Agent performance →
          </Link>
        }
      />

      {/* the filters are hidden on paper, so the printout says what it shows */}
      <p className="mb-4 hidden text-sm text-text print:block">
        <strong>{report.period.label}</strong>
        {report.period.partial && ' (in progress)'} · {filterSummary(report, view)} · printed {formatDate(report.today)}
      </p>

      <ReportViewer
        filtersClassName="flex flex-1 flex-col gap-3 print:hidden"
        summaryClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        actions={{
          onExportExcel: () => downloadCsv(collectionCsvName(report), collectionCsv(report, view)),
          onPrint: print,
        }}
        filters={
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <Select
                  label="Period"
                  value={periodMode}
                  onChange={(e) => {
                    const mode = e.target.value
                    if (mode === 'thisMonth') setPeriod({ thisMonth: true })
                    else if (mode === 'custom') setPeriod({ from: report.period.from, to: report.period.to })
                    else setPeriod({})
                  }}
                  options={[
                    { value: 'month', label: 'Month' },
                    { value: 'thisMonth', label: 'This month so far' },
                    { value: 'custom', label: 'Custom range' },
                  ]}
                />
              </div>
              {periodMode === 'month' && (
                <MonthPicker
                  month={report.period.month ?? lastComplete}
                  options={monthOptions}
                  ariaLabel="Report month"
                  // the last complete month is the default, so it stays out of the URL
                  onChange={(m) => setPeriod(m === thisMonth ? { thisMonth: true } : m === lastComplete ? {} : { month: m })}
                />
              )}
              {periodMode === 'custom' && (
                <>
                  <div className="w-40">
                    <Input
                      label="From"
                      type="date"
                      max={report.today}
                      value={view.from ?? report.period.from}
                      onChange={(e) => e.target.value && setPeriod({ from: e.target.value, to: view.to ?? report.period.to })}
                    />
                  </div>
                  <div className="w-40">
                    <Input
                      label="To"
                      type="date"
                      max={report.today}
                      value={view.to ?? report.period.to}
                      onChange={(e) => e.target.value && setPeriod({ from: view.from ?? report.period.from, to: e.target.value })}
                    />
                  </div>
                </>
              )}
              {isFetching && <Loader2 className="mb-2.5 size-4 animate-spin text-text-muted" aria-label="Updating" />}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_160px_auto]">
              <Select
                label="Route"
                placeholder="All routes"
                value={view.routeId === undefined ? '' : String(view.routeId)}
                onChange={(e) => setView({ routeId: e.target.value ? Number(e.target.value) : undefined })}
                options={report.options.routes.map((r) => ({ value: String(r.id), label: r.name }))}
              />
              <Select
                label="Agent"
                placeholder="All agents"
                value={view.agentId === undefined ? '' : String(view.agentId)}
                onChange={(e) => setView({ agentId: e.target.value ? Number(e.target.value) : undefined })}
                options={report.options.agents.map((a) => ({ value: String(a.id), label: a.name }))}
              />
              <Combobox
                label="Estate"
                placeholder="All estates — type to search"
                noun="estates"
                items={report.options.estates.filter((e) => view.includeDemo || !e.demo)}
                value={view.estateId === undefined ? '' : String(view.estateId)}
                onChange={(key) => setView({ estateId: key ? Number(key) : undefined })}
                getKey={(e) => String(e.id)}
                getLabel={(e) => e.name}
                getMeta={(e) => e.routeName ?? ''}
              />
              <Select
                label="Grade"
                placeholder="Both grades"
                value={view.grade ?? ''}
                onChange={(e) => setView({ grade: (e.target.value || undefined) as CollectionView['grade'] })}
                options={[
                  { value: 'super', label: 'Super' },
                  { value: 'normal', label: 'Normal' },
                ]}
              />
              <div className="flex items-end gap-3 pb-2">
                <Toggle checked={view.includeDemo} onChange={(v) => setView({ includeDemo: v })} label="Include demo data" />
                {filtered && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setView({ routeId: undefined, agentId: undefined, estateId: undefined, grade: undefined })}
                  >
                    <X className="size-4" /> Clear
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-text-muted print:block">
              Showing <strong className="text-text">{report.period.label}</strong>
              {report.period.partial && ' — a period in progress, compared only with the same days before'}
              {report.gradeFiltered && ` · ${view.grade === 'super' ? 'Super' : 'Normal'} grade only`}
            </p>
          </>
        }
        summary={<SummaryCards report={report} />}
        charts={
          <div className="flex flex-col gap-4">
            <div className="relative">
              <TrendChartCard
                title={`Factory weight by ${report.trend.granularity} — ${report.period.label}`}
                data={report.trend.points.map((p, i) => ({
                  label: p.label,
                  value: p.kg,
                  count: p.deliveries,
                  partial: p.partial,
                  compare: report.trend.lastYear[i]?.kg ?? null,
                  compareCount: report.trend.lastYear[i]?.deliveries ?? null,
                }))}
                valueFmt={formatKg}
                yTickFormat={formatNumber}
                showCompare={view.compareLastYear}
                partialNote={report.trend.granularity === 'month' ? 'Month in progress' : 'Day in progress'}
              />
              <div className="absolute right-5 top-4 print:hidden">
                <Toggle checked={view.compareLastYear} onChange={(v) => setView({ compareLastYear: v })} label="Same period last year" />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <HorizontalBarChartCard
                title="By route"
                data={report.byRoute.map((r) => ({ name: r.name, value: r.kg, meta: `${r.deliveries} deliveries` }))}
                valueFmt={formatKg}
                tickFormat={formatNumber}
                onBarClick={(d) => {
                  const route = report.byRoute.find((r) => r.name === d.name)
                  if (route?.id != null) setView({ routeId: route.id })
                }}
              />
              <HorizontalBarChartCard
                title="Top 10 estates by factory weight"
                data={report.topEstates.map((e) => ({ name: e.name, value: e.kg, meta: e.routeName ?? undefined }))}
                valueFmt={formatKg}
                tickFormat={formatNumber}
                footer={
                  <button type="button" onClick={showAll} className="font-medium text-primary hover:underline print:hidden">
                    View all estates →
                  </button>
                }
              />
              <DonutChartCard
                title={`Grade split — ${report.period.label}`}
                centerLabel={report.gradeSplit.superShare === null ? '—' : `Super ${report.gradeSplit.superShare}%`}
                valueFmt={formatKg}
                data={[
                  { name: 'Super', value: report.gradeSplit.superKg, color: GRADE_SUPER },
                  { name: 'Normal', value: report.gradeSplit.normalKg, color: GRADE_NORMAL },
                ]}
              />
            </div>
            {report.gradeByMonth && (
              <StackedBarChartCard
                title="Super and Normal by month"
                data={report.gradeByMonth.map((m) => ({
                  // the month in progress is labelled as such, like the trend's hollow point
                  label: report.trend.points.find((p) => p.key === m.key)?.partial ? `${m.label} (so far)` : m.label,
                  superKg: m.superKg,
                  normalKg: m.normalKg,
                }))}
                series={[
                  { key: 'normalKg', name: 'Normal', color: GRADE_NORMAL },
                  { key: 'superKg', name: 'Super', color: GRADE_SUPER },
                ]}
                valueFmt={formatKg}
                tickFormat={formatNumber}
              />
            )}
          </div>
        }
        table={
          <div ref={tableRef} className="scroll-mt-20">
            <Tabs
              tabs={GROUP_TABS}
              active={view.groupBy}
              onChange={(t) => setView({ groupBy: t as CollectionGroupBy })}
              className="mb-3 print:hidden"
            />
            {report.table.rows.length === 0 ? (
              <EmptyState title="No deliveries" description="No leaf was delivered in this period with these filters." />
            ) : (
              <DataTable
                key={report.table.groupBy}
                columns={tableColumns(report)}
                rows={report.table.rows}
                rowKey={(r) => r.key}
                pageSize={printing ? Math.max(1, report.table.rows.length) : 15}
                stickyFirstColumn
                defaultSort={report.table.groupBy === 'day' ? undefined : { key: 'factoryKg', direction: 'desc' }}
                footer={{ ...report.table.totals, key: 'total', name: 'Total', routeName: null, id: null }}
                onRowClick={(r) => {
                  if (r.id === null) return
                  if (report.table.groupBy === 'estate') navigate(estateTimelineHref(r.id))
                  else if (report.table.groupBy === 'route') setView({ routeId: r.id, groupBy: 'estate' })
                  else if (report.table.groupBy === 'agent') setView({ agentId: r.id, groupBy: 'estate' })
                }}
              />
            )}
          </div>
        }
      />
    </div>
  )
}

/* ── Cards ── */

/** A change line; `base` names what it is measured against, so a huge % on a tiny base reads as such. */
function Change({ value, unit = '%', label, base }: { value: number | null; unit?: string; label: string; base?: string }) {
  return (
    <p className="tabular">
      <span className={cn(value !== null && value > 0 && 'text-success-fg', value !== null && value < 0 && 'text-danger-fg')}>
        {value === null ? 'No data' : signedPct(value, unit)}
      </span>{' '}
      {label}
      {base && value !== null && <span className="text-text-muted"> ({base})</span>}
    </p>
  )
}

function SummaryCards({ report }: { report: CollectionReport }) {
  const { cards, period, tolerancePct, gradeFiltered } = report
  const soFar = period.partial ? ' (same days)' : ''
  return (
    <>
      <SummaryCard
        icon={<Scale className="size-4" />}
        label="Factory weight"
        value={formatKg(cards.factoryKg.value)}
        note={
          <>
            <Change value={cards.factoryKg.changePct} label={`vs previous period${soFar}`} base={formatKg(cards.factoryKg.previous)} />
            {cards.factoryKg.lastYear === null ? (
              <p>No data last year</p>
            ) : (
              <Change value={cards.factoryKg.yoyPct} label="vs same period last year" base={formatKg(cards.factoryKg.lastYear)} />
            )}
          </>
        }
        rule="Σ grade lines of graded deliveries (collected or confirmed, with grade lines) dated in the period. Compared with the period just before and the same dates a year earlier — tea is seasonal, so year on year is the fair comparison."
      />
      <SummaryCard
        icon={<Truck className="size-4" />}
        label="Deliveries"
        value={formatNumber(cards.deliveries.value)}
        note={
          <>
            <p>{cards.deliveries.avgKg === null ? 'No graded deliveries' : `${formatKg(cards.deliveries.avgKg)} per delivery`}</p>
            <p>
              {cards.deliveries.ungraded} ungraded ({formatKg(cards.deliveries.ungradedEstateKg)} estate) · {cards.deliveries.provisional}{' '}
              provisional
            </p>
          </>
        }
        rule="Graded deliveries in the period; average = factory kg ÷ graded deliveries. Ungraded deliveries (estate weight only) and provisional entries awaiting the agent are counted apart, never in the weights."
      />
      <SummaryCard
        icon={<Building2 className="size-4" />}
        label="Supplying estates"
        value={`${cards.supplyingEstates.value} of ${cards.supplyingEstates.of}`}
        note={
          cards.supplyingEstates.notSupplying.length
            ? `${cards.supplyingEstates.notSupplying.length} active ${cards.supplyingEstates.notSupplying.length === 1 ? 'estate' : 'estates'} did not supply`
            : 'Every active estate supplied'
        }
        rule="Active estates (within the route / estate filters) that delivered any leaf, graded or not, in the period."
        preview={
          cards.supplyingEstates.notSupplying.length ? (
            <div>
              <p className="mb-1 font-medium text-text">Did not supply</p>
              <ul className="max-h-56 divide-y divide-border overflow-y-auto">
                {cards.supplyingEstates.notSupplying.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 py-1">
                    <Link to={estateTimelineHref(e.id)} className="truncate text-text hover:text-primary hover:underline">
                      {e.name}
                    </Link>
                    <span className="shrink-0 text-text-muted">{e.routeName ?? '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : undefined
        }
      />
      <SummaryCard
        icon={<Layers className="size-4" />}
        label="Super share"
        value={cards.superShare.value === null ? '—' : `${cards.superShare.value.toFixed(1)}%`}
        note={<Change value={cards.superShare.changePts} unit=" pts" label={`vs previous period${soFar}`} />}
        rule="Super kg ÷ factory kg of graded deliveries. The change is in percentage points."
      />
      <SummaryCard
        icon={<AlertTriangle className="size-4" />}
        label="Weight difference"
        value={cards.weightDiff.value === null ? '—' : `${cards.weightDiff.value.toFixed(1)}%`}
        tone={cards.weightDiff.overTolerance.length ? 'danger' : 'default'}
        note={
          gradeFiltered ? (
            'Not split by grade'
          ) : (
            <p>
              {cards.weightDiff.overTolerance.length} {cards.weightDiff.overTolerance.length === 1 ? 'delivery' : 'deliveries'} above the{' '}
              {tolerancePct}% tolerance
            </p>
          )
        }
        rule={`(estate kg − factory kg) ÷ estate kg over graded deliveries. A delivery is above tolerance when its factory and estate weights differ by more than ${tolerancePct}% (collection.mismatchTolerancePct) — the same rule grading uses.`}
        preview={
          cards.weightDiff.overTolerance.length ? (
            <div>
              <p className="mb-1 font-medium text-text">Above {tolerancePct}% tolerance</p>
              <ul className="max-h-56 divide-y divide-border overflow-y-auto">
                {cards.weightDiff.overTolerance.map((d) => (
                  <li key={d.id} className="py-1">
                    <p className="flex justify-between gap-3">
                      <span className="truncate text-text">{d.estateName}</span>
                      <span className="tabular shrink-0 text-danger-fg">{signedPct(d.diffPct)}</span>
                    </p>
                    <p className="tabular text-text-muted">
                      {formatDate(d.date)} · estate {formatKg(d.estateKg)} · factory {formatKg(d.factoryKg)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : undefined
        }
      />
    </>
  )
}

/* ── Table ── */

function tableColumns(report: CollectionReport): Column<CollectionGroupRow>[] {
  const by = report.table.groupBy
  const kg = (v: number | null) => (v === null ? '—' : formatKg(v))
  // figures never wrap ("5,867.0" / "kg" on two lines); the table scrolls sideways instead
  const nameHeader = { estate: 'Estate', route: 'Route', agent: 'Agent', day: 'Day' }[by]
  const cols: Column<CollectionGroupRow>[] = [
    {
      key: 'name',
      header: nameHeader,
      minWidth: 200,
      sortable: by !== 'day',
      sortValue: (r) => r.name,
      render: (r) =>
        r.key === 'total' ? (
          'Total'
        ) : (
          <div>
            <p className="font-medium text-text">{by === 'day' ? formatDate(r.name) : r.name}</p>
            {r.routeName && <p className="text-xs text-text-muted">{r.routeName}</p>}
            {by === 'agent' && r.id !== null && (
              <Link
                to={performanceHref(report.period.month)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-primary hover:underline"
              >
                Performance →
              </Link>
            )}
          </div>
        ),
    },
    {
      key: 'deliveries',
      header: 'Deliveries',
      align: 'right',
      sortable: true,
      sortValue: (r) => r.deliveries,
      render: (r) => formatNumber(r.deliveries),
    },
    { key: 'estateKg', header: 'Estate kg', align: 'right', sortable: true, sortValue: (r) => r.estateKg ?? -1, render: (r) => kg(r.estateKg) },
    { key: 'factoryKg', header: 'Factory kg', align: 'right', sortable: true, sortValue: (r) => r.factoryKg, render: (r) => kg(r.factoryKg) },
    {
      key: 'diffPct',
      header: 'Difference',
      align: 'right',
      sortable: true,
      sortValue: (r) => Math.abs(r.diffPct ?? 0),
      render: (r) =>
        r.diffPct === null ? (
          '—'
        ) : (
          <span
            className={cn(Math.abs(r.diffPct) > report.tolerancePct && 'font-semibold text-danger-fg')}
            title={Math.abs(r.diffPct) > report.tolerancePct ? `Above the ${report.tolerancePct}% tolerance` : undefined}
          >
            {signedPct(r.diffPct)}
          </span>
        ),
    },
    { key: 'superKg', header: 'Super kg', align: 'right', sortable: true, sortValue: (r) => r.superKg, render: (r) => kg(r.superKg) },
    { key: 'normalKg', header: 'Normal kg', align: 'right', sortable: true, sortValue: (r) => r.normalKg, render: (r) => kg(r.normalKg) },
    {
      key: 'superShare',
      header: 'Super share',
      align: 'right',
      sortable: true,
      sortValue: (r) => r.superShare ?? -1,
      render: (r) => (r.superShare === null ? '—' : `${r.superShare.toFixed(1)}%`),
    },
    {
      key: 'ungraded',
      header: 'Ungraded',
      align: 'right',
      sortable: true,
      sortValue: (r) => r.ungradedDeliveries,
      render: (r) => (r.ungradedDeliveries ? `${r.ungradedDeliveries} · ${formatKg(r.ungradedEstateKg)}` : '—'),
    },
  ]
  for (const c of cols.slice(1)) c.className = 'whitespace-nowrap'
  if (by !== 'day') {
    cols.push({
      className: 'whitespace-nowrap',
      key: 'changePct',
      header: 'vs previous',
      align: 'right',
      sortable: true,
      sortValue: (r) => r.changePct ?? -Infinity,
      render: (r) =>
        r.key === 'total' || r.changePct !== null ? (
          <span className={cn(r.changePct !== null && r.changePct < 0 && 'text-danger-fg')}>{signedPct(r.changePct)}</span>
        ) : (
          <span className="text-text-muted">New</span>
        ),
    })
  }
  return cols
}
