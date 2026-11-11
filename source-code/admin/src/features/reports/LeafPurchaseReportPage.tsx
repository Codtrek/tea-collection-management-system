import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Banknote, HandCoins, Loader2, Receipt, Scale, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import {
  ComboChartCard,
  DonutChartCard,
  HorizontalBarChartCard,
  StackedBarChartCard,
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
import { formatCompact, formatCurrency, formatDate, formatKg, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { estateTimelineHref, signedPct } from './collection-report-view'
import { leafFilterSummary, leafQuery, leafViewParams, readLeafView, settlementsHref, type LeafView } from './leaf-purchase-view'
import type { LeafGroupBy, LeafGroupRow, LeafPurchaseReport } from './types'

const DEMO_DEFAULT = import.meta.env.DEV

const GROUP_TABS: { id: LeafGroupBy; label: string }[] = [
  { id: 'estate', label: 'Estate' },
  { id: 'route', label: 'Route' },
  { id: 'month', label: 'Month' },
]

/** Compact money ticks ("750.0K", "1.0M") — the exact figure is in each tooltip. */
const rsTick = (v: number) => formatCompact(v)
const rsPerKg = (v: number) => `${formatCurrency(v)}/kg`

/*
  RPT-02 Leaf Purchase — what the factory owes and pays estate owners for green leaf (Reports
  addendum §9). Every figure comes from `GET /reports/leaf-purchases`; the page recomputes none.
  Leaf is valued at the grade rate in force on each delivery date (Grade-Rates-Addendum). The whole
  view lives in the URL.
*/
export function LeafPurchaseReportPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = readLeafView(params, DEMO_DEFAULT)
  const setView = (patch: Partial<LeafView>) => setParams(leafViewParams({ ...view, ...patch }, DEMO_DEFAULT), { replace: true })
  const setPeriod = (p: Pick<LeafView, 'month' | 'from' | 'to' | 'thisMonth'>) =>
    setView({ month: undefined, from: undefined, to: undefined, thisMonth: undefined, ...p })
  const tableRef = useRef<HTMLDivElement>(null)
  // while printing, the table shows every row (the print layout has no pager)
  const [printing, setPrinting] = useState(false)

  const query = leafQuery(view)
  const { data: report, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['reports', 'leaf-purchases', query],
    queryFn: () => reportsService.getLeafPurchaseReport(query),
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
        title="Couldn't load the leaf purchase report"
        description="Something went wrong fetching leaf purchase data."
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
  const filtered = view.routeId !== undefined || view.estateId !== undefined || !!view.grade
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
        title="Leaf Purchase Report"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Leaf purchases' }]}
        description="What the factory owes and pays estate owners for green leaf."
        actions={
          <Link to={settlementsHref(report)} className="text-sm font-medium text-primary hover:underline">
            Estate Owner Payments →
          </Link>
        }
      />

      {/* the filters are hidden on paper, so the printout says what it shows */}
      <p className="mb-4 hidden text-sm text-text print:block">
        <strong>{report.period.label}</strong>
        {report.period.partial && ' (in progress)'} · {leafFilterSummary(report, view)} · printed {formatDate(report.today)}
      </p>

      <ReportViewer
        filtersClassName="flex flex-1 flex-col gap-3 print:hidden"
        summaryClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        actions={{ onPrint: print }}
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.4fr_160px_auto]">
              <Select
                label="Route"
                placeholder="All routes"
                value={view.routeId === undefined ? '' : String(view.routeId)}
                onChange={(e) => setView({ routeId: e.target.value ? Number(e.target.value) : undefined })}
                options={report.options.routes.map((r) => ({ value: String(r.id), label: r.name }))}
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
                onChange={(e) => setView({ grade: (e.target.value || undefined) as LeafView['grade'] })}
                options={[
                  { value: 'super', label: 'Super' },
                  { value: 'normal', label: 'Normal' },
                ]}
              />
              <div className="flex items-end gap-3 pb-2">
                <Toggle checked={view.includeDemo} onChange={(v) => setView({ includeDemo: v })} label="Include demo data" />
                {filtered && (
                  <Button size="sm" variant="ghost" onClick={() => setView({ routeId: undefined, estateId: undefined, grade: undefined })}>
                    <X className="size-4" /> Clear
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-text-muted">
              Showing <strong className="text-text">{report.period.label}</strong>
              {report.period.partial && ' — a period in progress, compared only with the same days before'}
              {report.gradeFiltered && ` · ${view.grade === 'super' ? 'Super' : 'Normal'} grade only`}
            </p>
            {report.cards.noRate.deliveries > 0 && (
              <p className="flex items-center gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                {report.cards.noRate.deliveries} graded {report.cards.noRate.deliveries === 1 ? 'delivery has' : 'deliveries have'} no grade
                rate for {report.cards.noRate.deliveries === 1 ? 'its' : 'their'} date ({formatKg(report.cards.noRate.kg)}). They are
                counted here but not valued — add a rate version in Factory Setup if they should be.
              </p>
            )}
          </>
        }
        summary={<Cards report={report} />}
        charts={
          <div className="flex flex-col gap-4">
            <ComboChartCard
              title={`Leaf value and average price by month${report.period.kind === 'month' ? ' — the 12 months to ' + report.period.label : ''}`}
              data={report.trend.map((p) => ({
                label: p.label,
                bar: p.valueRs,
                line: p.rsPerKg,
                note: `${formatKg(p.factoryKg)} graded`,
                partial: p.partial,
              }))}
              barLabel="Leaf value"
              lineLabel="Average Rs/kg"
              barFmt={formatCurrency}
              barTick={rsTick}
              lineFmt={rsPerKg}
              lineTick={(v) => formatNumber(Math.round(v))}
            />
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <HorizontalBarChartCard
                title="By route"
                data={report.byRoute.map((r) => ({ name: r.name, value: r.valueRs, meta: `${formatKg(r.factoryKg)} graded` }))}
                valueFmt={formatCurrency}
                tickFormat={rsTick}
                onBarClick={(d) => {
                  const route = report.byRoute.find((r) => r.name === d.name)
                  if (route?.id != null) setView({ routeId: route.id })
                }}
              />
              <HorizontalBarChartCard
                title="Top 10 estates by leaf value"
                data={report.topEstates.map((e) => ({ name: e.name, value: e.valueRs, meta: e.routeName ?? undefined }))}
                valueFmt={formatCurrency}
                tickFormat={rsTick}
                footer={
                  <button type="button" onClick={showAll} className="font-medium text-primary hover:underline print:hidden">
                    View all estates →
                  </button>
                }
              />
              <DonutChartCard
                title={`By grade — ${report.period.label}`}
                centerLabel={formatCurrency(report.cards.leafValue.value)}
                valueFmt={formatCurrency}
                data={[
                  { name: 'Super', value: report.byGrade.superRs, color: GRADE_SUPER },
                  { name: 'Normal', value: report.byGrade.normalRs, color: GRADE_NORMAL },
                ]}
              />
            </div>
            {report.gradeByMonth && (
              <StackedBarChartCard
                title="Leaf value by grade and month"
                data={report.gradeByMonth.map((m) => ({
                  // the month in progress is labelled as such
                  label: report.trend.find((p) => p.key === m.key)?.partial ? `${m.label} (so far)` : m.label,
                  superRs: m.superRs,
                  normalRs: m.normalRs,
                }))}
                series={[
                  { key: 'normalRs', name: 'Normal', color: GRADE_NORMAL },
                  { key: 'superRs', name: 'Super', color: GRADE_SUPER },
                ]}
                valueFmt={formatCurrency}
                tickFormat={rsTick}
              />
            )}
          </div>
        }
        table={
          <div ref={tableRef} className="scroll-mt-20">
            <Tabs
              tabs={GROUP_TABS}
              active={view.groupBy}
              onChange={(t) => setView({ groupBy: t as LeafGroupBy })}
              className="mb-3 print:hidden"
            />
            {report.table.rows.length === 0 ? (
              <EmptyState title="No graded leaf" description="No graded deliveries in this period with these filters." />
            ) : (
              <DataTable
                key={report.table.groupBy}
                columns={tableColumns(report)}
                rows={report.table.rows}
                rowKey={(r) => r.key}
                pageSize={printing ? Math.max(1, report.table.rows.length) : 15}
                stickyFirstColumn
                defaultSort={report.table.groupBy === 'month' ? undefined : { key: 'valueRs', direction: 'desc' }}
                footer={{ ...report.table.totals, key: 'total', name: 'Total', routeName: null, id: null }}
                onRowClick={(r) => {
                  if (report.table.groupBy === 'estate' && r.id !== null) navigate(estateTimelineHref(r.id))
                  else if (report.table.groupBy === 'route' && r.id !== null) setView({ routeId: r.id, groupBy: 'estate' })
                  else if (report.table.groupBy === 'month') setPeriod({ month: r.key })
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

function Change({ value, label, base }: { value: number | null; label: string; base?: string }) {
  return (
    <p className="tabular">
      <span className={cn(value !== null && value > 0 && 'text-success-fg', value !== null && value < 0 && 'text-danger-fg')}>
        {value === null ? 'No data' : signedPct(value)}
      </span>{' '}
      {label}
      {base && value !== null && <span className="text-text-muted"> ({base})</span>}
    </p>
  )
}

function Cards({ report }: { report: LeafPurchaseReport }) {
  const { cards, period } = report
  const soFar = period.partial ? ' (same days)' : ''
  const { payments } = cards
  return (
    <>
      <SummaryCard
        icon={<Banknote className="size-4" />}
        label="Leaf value (accrued)"
        value={formatCurrency(cards.leafValue.value)}
        note={
          <>
            <Change value={cards.leafValue.changePct} label={`vs previous period${soFar}`} base={formatCurrency(cards.leafValue.previous)} />
            {cards.leafValue.lastYear === null ? (
              <p>No data last year</p>
            ) : (
              <Change value={cards.leafValue.yoyPct} label="vs same period last year" base={formatCurrency(cards.leafValue.lastYear)} />
            )}
          </>
        }
        rule="For each graded delivery in the period: Super kg × Super rate + Normal kg × Normal rate, using the grade-rate version in force on the delivery date (Factory Setup). A later rate change never alters it."
      />
      <SummaryCard
        icon={<Scale className="size-4" />}
        label="Average price per kg"
        value={cards.pricePerKg.value === null ? '—' : rsPerKg(cards.pricePerKg.value)}
        note={
          <>
            <p className="tabular">
              Super {cards.pricePerKg.superRsPerKg === null ? '—' : rsPerKg(cards.pricePerKg.superRsPerKg)} · Normal{' '}
              {cards.pricePerKg.normalRsPerKg === null ? '—' : rsPerKg(cards.pricePerKg.normalRsPerKg)}
            </p>
            <Change value={cards.pricePerKg.changePct} label={`vs previous period${soFar}`} />
          </>
        }
        rule="Leaf value ÷ factory kg of the valued deliveries; per grade, that grade's value ÷ its kg. It moves with the grade mix as well as the rates."
      />
      <SummaryCard
        icon={<HandCoins className="size-4" />}
        label="Settled vs not yet settled"
        value={formatCurrency(cards.settlement.unsettledRs)}
        note={
          <>
            <p className="tabular">
              not yet settled · {formatCurrency(cards.settlement.settledRs)} settled
            </p>
            <Link to={settlementsHref(report)} className="font-medium text-primary hover:underline">
              Estate Owner Payments →
            </Link>
          </>
        }
        rule="Settled = the leaf value of deliveries taken by a processed settlement. Not yet settled = the rest, so the two always add up to the leaf value. No settlement generator exists yet, so deliveries aren't linked to settlements and everything reads as not yet settled."
      />
      <SummaryCard
        icon={<Receipt className="size-4" />}
        label="Paid in settlements"
        value={payments.count ? formatCurrency(payments.netRs) : '—'}
        note={
          payments.count ? (
            <>
              <p className="tabular">
                Gross {formatCurrency(payments.grossRs)} − transport {formatCurrency(payments.transportRs)} − fertilizer{' '}
                {formatCurrency(payments.fertilizerRs)} − advances {formatCurrency(payments.advancesRs)}
                {payments.adjustmentRs !== 0 && ` + adjustments ${formatCurrency(payments.adjustmentRs)}`}
              </p>
              {!payments.linked && <p className="text-warning-fg">Not linked to these deliveries (recorded settlements)</p>}
            </>
          ) : (
            'No processed settlement in this period'
          )
        }
        rule="Net paid to owners by the processed settlements of the period: gross (at each settlement's own rates) − transport − fertilizer − advance deductions + adjustments. These deductions are recoveries from owners, not factory expenses — they are not on the Expense report."
      />
    </>
  )
}

/* ── Table ── */

function tableColumns(report: LeafPurchaseReport): Column<LeafGroupRow>[] {
  const by = report.table.groupBy
  const nameHeader = { estate: 'Estate', route: 'Route', month: 'Month' }[by]
  const num = (key: keyof LeafGroupRow, header: string, fmt: (v: number) => string): Column<LeafGroupRow> => ({
    key: String(key),
    header,
    align: 'right',
    sortable: true,
    className: 'whitespace-nowrap',
    sortValue: (r) => (r[key] as number | null) ?? -1,
    render: (r) => {
      const v = r[key] as number | null
      return v === null ? '—' : fmt(v)
    },
  })
  const cols: Column<LeafGroupRow>[] = [
    {
      key: 'name',
      header: nameHeader,
      minWidth: 200,
      sortable: by !== 'month',
      sortValue: (r) => r.name,
      render: (r) =>
        r.key === 'total' ? (
          'Total'
        ) : (
          <div>
            <p className="font-medium text-text">{r.name}</p>
            {r.routeName && <p className="text-xs text-text-muted">{r.routeName}</p>}
          </div>
        ),
    },
    num('factoryKg', 'Factory kg', formatKg),
    num('superKg', 'Super kg', formatKg),
    num('normalKg', 'Normal kg', formatKg),
    num('valueRs', 'Leaf value', formatCurrency),
    num('rsPerKg', 'Rs/kg', formatCurrency),
    num('settledRs', 'Settled', formatCurrency),
    num('unsettledRs', 'Not yet settled', formatCurrency),
  ]
  if (by !== 'month') {
    cols.push({
      key: 'changePct',
      header: 'vs previous',
      align: 'right',
      sortable: true,
      className: 'whitespace-nowrap',
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
