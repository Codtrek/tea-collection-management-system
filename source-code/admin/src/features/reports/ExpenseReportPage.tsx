import { useRef, useState, type Ref } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Coins, HandCoins, Info, Leaf, Loader2, PieChart, Plus, Receipt, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import { HorizontalBarChartCard, StackedBarChartCard } from '@/components/charts/ChartCard'
import { CHART_SERIES } from '@/components/charts/palette'
import { SummaryCard } from '@/components/data/SummaryCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { MonthPicker } from '@/components/patterns/MonthPicker'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Popover } from '@/components/ui/Popover'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Tabs } from '@/components/ui/Tabs'
import { useAuth } from '@/context/AuthContext'
import * as reportsService from '@/services/reports'
import { currentMonth, monthOptionsFor, periodOf, shiftMonth } from '@/lib/month'
import { formatCompact, formatCurrency, formatDate, formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'
import { signedPct } from './collection-report-view'
import { EXPENSE_KINDS, expenseQuery, expenseViewParams, readExpenseView, type ExpenseView } from './expense-report-view'
import type { ExpenseGroupBy, ExpenseKind, ExpenseReport, ExpenseTableRow } from './types'

const GROUP_TABS: { id: ExpenseGroupBy; label: string }[] = [
  { id: 'category', label: 'Category' },
  { id: 'month', label: 'Month' },
  { id: 'entry', label: 'Entry' },
]

/** one colour per kind of expense — the same on the bars, the category chart and the table */
const KIND_COLOR: Record<ExpenseKind, string> = {
  leaf: CHART_SERIES[0],
  wages: CHART_SERIES[3],
  stock: CHART_SERIES[4],
  operating: CHART_SERIES[6],
}

const rsTick = (v: number) => formatCompact(v)

/*
  RPT-03 Expense report (Finance-Reports-Addendum) — what the factory spends: green leaf purchases
  at the grade rates in force, processed wages, fertilizer stock bought and daily expense entries.
  Charges recovered from estate owners, advances (loans) and wages not yet processed are shown
  beside the total, never in it. Every figure comes from `GET /reports/expenses`; the page recomputes
  none. The whole view lives in the URL.
*/
export function ExpenseReportPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const view = readExpenseView(params)
  const setView = (patch: Partial<ExpenseView>) => setParams(expenseViewParams({ ...view, ...patch }), { replace: true })
  const setPeriod = (p: Pick<ExpenseView, 'month' | 'from' | 'to' | 'thisMonth'>) =>
    setView({ month: undefined, from: undefined, to: undefined, thisMonth: undefined, ...p })
  const recoveriesRef = useRef<HTMLElement>(null)
  const [recoveriesOpen, setRecoveriesOpen] = useState(false)

  const query = expenseQuery(view)
  const { data: report, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['reports', 'expenses', query],
    queryFn: () => reportsService.getExpenseReport(query),
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
        title="Couldn't load the expense report"
        description="Something went wrong fetching expense data."
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
  const total = report.cards.total.value
  const openRecoveries = () => {
    setRecoveriesOpen(true)
    recoveriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <PageHeader
        title="Expense Reports"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Expenses' }]}
        description="What the factory spends: green leaf, wages, fertilizer stock and daily operating costs. Money recovered from estate owners and advances are not expenses."
        actions={
          can('expenses', 'edit') ? (
            <Button onClick={() => navigate('/reports/expenses/new')}>
              <Plus className="size-4" /> Log Daily Expense
            </Button>
          ) : undefined
        }
      />

      {/* the filters are hidden on paper, so the printout says what it shows */}
      <p className="mb-4 hidden text-sm text-text print:block">
        <strong>{report.period.label}</strong>
        {report.period.partial && ' (in progress)'} · {report.filters.category ? `Category: ${report.filters.category}` : 'All categories'} ·
        printed {formatDate(report.today)}
      </p>

      <ReportViewer
        filtersClassName="flex flex-1 flex-col gap-3 print:hidden"
        summaryClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
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
              <div className="w-56">
                <Select
                  label="Category"
                  placeholder="All categories"
                  value={view.category ?? ''}
                  onChange={(e) => setView({ category: e.target.value || undefined })}
                  options={report.options.categories.map((c) => ({ value: c, label: c }))}
                />
              </div>
              {view.category && (
                <Button size="sm" variant="ghost" className="mb-1" onClick={() => setView({ category: undefined })}>
                  <X className="size-4" /> Clear
                </Button>
              )}
              {isFetching && <Loader2 className="mb-2.5 size-4 animate-spin text-text-muted" aria-label="Updating" />}
            </div>
            <p className="text-sm text-text-muted">
              Showing <strong className="text-text">{report.period.label}</strong>
              {report.period.partial && ' — a month in progress, compared only with the same days before'}
            </p>
          </>
        }
        summary={<Cards report={report} onOpenRecoveries={openRecoveries} />}
        charts={
          total === 0 ? (
            // never an all-zero chart: say why the period is empty
            <EmptyState
              title={`No expenses in ${report.period.label}`}
              description={
                <>
                  {report.empty.reason}
                  {report.empty.hints.map((h) => (
                    <span key={h} className="mt-2 block">
                      {h}
                    </span>
                  ))}
                </>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {report.empty.hints.length > 0 && <Hints hints={report.empty.hints} />}
              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                <StackedBarChartCard
                  title={`Expenses by month${report.period.kind === 'month' ? ' — the 12 months to ' + report.period.label : ''}`}
                  data={report.trend.map((t) => ({
                    label: t.partial ? `${t.label} (so far)` : t.label,
                    leaf: t.leaf,
                    wages: t.wages,
                    stock: t.stock,
                    operating: t.operating,
                  }))}
                  partial={report.trend.map((t) => t.partial)}
                  series={EXPENSE_KINDS.map((k) => ({ key: k.key, name: k.name, color: KIND_COLOR[k.key] }))}
                  valueFmt={formatCurrency}
                  tickFormat={rsTick}
                  height={280}
                />
                <HorizontalBarChartCard
                  title={`By category — ${report.period.label}`}
                  data={report.byCategory.map((c) => ({
                    name: c.category,
                    value: c.amount,
                    meta: c.pct === null ? undefined : `${c.pct}% of total`,
                    color: KIND_COLOR[c.kind],
                  }))}
                  valueFmt={formatCurrency}
                  tickFormat={rsTick}
                  onBarClick={(d) => setView({ category: d.name, groupBy: 'entry' })}
                />
              </div>
            </div>
          )
        }
        table={
          <div className="flex flex-col gap-4">
            <NotExpenses report={report} panelRef={recoveriesRef} open={recoveriesOpen} onToggle={() => setRecoveriesOpen((o) => !o)} />
            {total > 0 && (
              <div>
                <Tabs
                  tabs={GROUP_TABS}
                  active={view.groupBy}
                  onChange={(t) => setView({ groupBy: t as ExpenseGroupBy })}
                  className="mb-3 print:hidden"
                />
                <DataTable
                  key={report.table.groupBy}
                  columns={tableColumns(report)}
                  rows={report.table.rows}
                  rowKey={(r) => r.key}
                  pageSize={25}
                  defaultSort={report.table.groupBy === 'category' ? { key: 'amount', direction: 'desc' } : undefined}
                  footer={totalsRow(report)}
                  onRowClick={(r) => {
                    if (report.table.groupBy === 'month') setPeriod({ month: r.key })
                    else if (report.table.groupBy === 'category') setView({ category: r.name, groupBy: 'entry' })
                    else if (r.href) navigate(r.href)
                  }}
                />
              </div>
            )}
            {report.stockLost.length > 0 && <StockLostPanel period={report.period.label} lines={report.stockLost} />}
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
      <span className="text-text">{value === null ? 'No data' : signedPct(value)}</span> {label}
      {base && value !== null && <span className="text-text-muted"> ({base})</span>}
    </p>
  )
}

function Cards({ report, onOpenRecoveries }: { report: ExpenseReport; onOpenRecoveries: () => void }) {
  const { cards, period } = report
  const soFar = period.partial ? ' (same days)' : ''
  const rec = cards.recovered
  return (
    <>
      <SummaryCard
        icon={<Receipt className="size-4" />}
        label="Total expenses"
        value={formatCurrency(cards.total.value)}
        note={
          <>
            {cards.total.previous === null ? (
              <p>No data the previous period</p>
            ) : (
              <Change value={cards.total.changePct} label={`vs previous period${soFar}`} base={formatCurrency(cards.total.previous)} />
            )}
            {cards.total.lastYear === null ? (
              <p>No data last year</p>
            ) : (
              <Change value={cards.total.yoyPct} label="vs same period last year" base={formatCurrency(cards.total.lastYear)} />
            )}
          </>
        }
        rule="Green leaf purchases (graded kg × the grade rate in force on each delivery date) + processed payroll (gross, by pay month) + fertilizer stock bought (quantity × unit cost, by date received) + daily expense entries (by expense date). Recoveries from estate owners, advances and estimated wages are never in it."
      />
      <SummaryCard
        icon={<PieChart className="size-4" />}
        label="Largest category"
        value={cards.largest ? cards.largest.category : '—'}
        note={
          cards.largest ? (
            <p className="tabular">
              {formatCurrency(cards.largest.amount)} · {cards.largest.pct}% of total
            </p>
          ) : (
            'No expenses in this period'
          )
        }
        rule="The category with the largest amount in the period, and its share of the total. Daily expense entries count under their own category (Electricity, Firewood…)."
      />
      <SummaryCard
        icon={<Leaf className="size-4" />}
        label="Leaf purchases"
        value={cards.leafShare.pct === null ? '—' : `${cards.leafShare.pct}%`}
        note={
          <>
            <p className="tabular">of total · {formatCurrency(cards.leafShare.amount)}</p>
            <Link to={leafHref(report)} className="font-medium text-primary hover:underline print:hidden">
              Leaf Purchase Report →
            </Link>
          </>
        }
        rule="Green leaf purchases ÷ total expenses. The leaf figure is the same number, from the same service, as the Leaf Purchase Report for this period."
      />
      <SummaryCard
        icon={<HandCoins className="size-4" />}
        label="Recovered from estate owners"
        value={formatCurrency(rec.totalRs)}
        note={
          rec.settlements ? (
            <p className="tabular">
              {rec.settlements} processed settlement{rec.settlements === 1 ? '' : 's'} · not an expense
            </p>
          ) : (
            'No processed settlement in this period'
          )
        }
        onOpen={onOpenRecoveries}
        openLabel="Show what was recovered"
        rule="Transport and fertilizer charges and advance installments deducted from estate owners on processed settlements (by settlement month), plus advance repayments made in cash or by bank. Money coming back to the factory, so never counted as an expense."
      />
    </>
  )
}

function leafHref(report: ExpenseReport): string {
  const p = report.period
  if (p.kind === 'thisMonth') return '/reports/leaf-purchases?thisMonth=1'
  if (p.kind === 'month' && p.month) return `/reports/leaf-purchases?month=${p.month}`
  return `/reports/leaf-purchases?from=${p.from}&to=${p.to}`
}

function Hints({ hints }: { hints: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {hints.map((h) => (
        <li key={h} className="flex items-start gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {h}
        </li>
      ))}
    </ul>
  )
}

/* ── Recovered, loaned and estimated: beside the total, never in it ── */

function NotExpenses({
  report,
  panelRef,
  open,
  onToggle,
}: {
  report: ExpenseReport
  panelRef: Ref<HTMLElement>
  open: boolean
  onToggle: () => void
}) {
  const rec = report.cards.recovered
  const est = report.wagesEstimate
  const loans = report.loans
  const line = (label: string, value: number, note?: string) => (
    <li key={label} className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-text">
        {label}
        {note && <span className="block text-xs text-text-muted">{note}</span>}
      </span>
      <span className="tabular text-text">{formatCurrency(value)}</span>
    </li>
  )
  return (
    <section ref={panelRef} id="recoveries" className="scroll-mt-20 rounded-[var(--radius-lg)] border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="recoveries-body"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-text-heading">Not expenses: recovered, loaned and estimated</span>
          <span className="tabular block text-xs text-text-muted">
            Recovered from estate owners {formatCurrency(rec.totalRs)} · loans issued {formatCurrency(loans.totalRs)} · estimated
            wages {formatCurrency(est.amountRs)}
          </span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-text-muted transition-transform print:hidden', open && 'rotate-180')} aria-hidden />
      </button>
      <div id="recoveries-body" className={cn('grid gap-4 border-t border-border p-4 md:grid-cols-3', !open && 'hidden print:grid')}>
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-heading">
            <HandCoins className="size-4 text-primary" aria-hidden /> Recovered from estate owners
          </h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {line('Transport charges', rec.transportRs)}
            {line('Fertilizer charges', rec.fertilizerRs)}
            {line('Advance installments', rec.advancesRs)}
          </ul>
          <div className="mt-2 flex items-baseline justify-between gap-4 rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2 text-sm">
            <span className="flex items-center gap-1 font-medium text-text">
              Net leaf cost
              <Popover
                align="left"
                panelClassName="w-72 p-3"
                trigger={() => (
                  <span className="inline-flex text-text-muted hover:text-primary">
                    <Info className="size-3.5" aria-hidden />
                    <span className="sr-only">How net leaf cost is worked out</span>
                  </span>
                )}
              >
                {() => (
                  <p className="text-xs font-normal text-text">
                    Green leaf purchases ({formatCurrency(report.cards.leafShare.amount)}) − transport charges recovered from estate
                    owners ({formatCurrency(rec.transportRs)}): what the leaf cost the factory once the owners have paid for its
                    transport.
                  </p>
                )}
              </Popover>
            </span>
            <span className="tabular font-semibold text-text">{formatCurrency(report.netLeafCostRs)}</span>
          </div>
        </div>
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-heading">
            <Coins className="size-4 text-primary" aria-hidden /> Loans issued (cash out)
          </h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {line('Estate owner advances', loans.estateRs)}
            {line('Salary advances', loans.salaryRs)}
          </ul>
          <p className="mt-2 text-xs text-text-muted">Money paid out and expected back through settlements and payroll, so not an expense.</p>
        </div>
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-heading">
            <Receipt className="size-4 text-primary" aria-hidden /> Estimated wages (not in total)
          </h3>
          {est.months.length ? (
            <ul className="mt-2 divide-y divide-border text-sm">
              {est.months.map((m) =>
                line(periodOf(m.month), m.amountRs, `${m.employees} employee${m.employees === 1 ? '' : 's'} · ${m.days} days of attendance`),
              )}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-text-muted">None: every month in this period with attendance has processed payroll.</p>
          )}
          <p className="mt-2 text-xs text-text-muted">
            Attendance × each employee’s pay rates, for months whose payroll isn’t processed yet. It becomes Wages once payroll is
            processed.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── Table ── */

const SOURCE_TONE = { Leaf: 'success', Payroll: 'assigned', Stock: 'approved', Manual: 'neutral' } as const

function totalsRow(report: ExpenseReport): ExpenseTableRow {
  return {
    key: 'total',
    name: 'Total',
    date: null,
    category: null,
    kind: null,
    description: null,
    source: null,
    href: null,
    enteredBy: null,
    paidVia: null,
    records: report.table.totals.records,
    amount: report.table.totals.amount,
    pct: report.table.totals.amount > 0 ? 100 : null,
  }
}

function tableColumns(report: ExpenseReport): Column<ExpenseTableRow>[] {
  const by = report.table.groupBy
  const amount: Column<ExpenseTableRow> = {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    sortable: true,
    className: 'whitespace-nowrap',
    sortValue: (r) => r.amount,
    render: (r) => formatCurrency(r.amount),
  }
  const pct: Column<ExpenseTableRow> = {
    key: 'pct',
    header: '% of total',
    align: 'right',
    sortable: true,
    sortValue: (r) => r.pct ?? -1,
    render: (r) => (r.pct === null ? '—' : `${r.pct}%`),
  }
  const records: Column<ExpenseTableRow> = {
    key: 'records',
    header: 'Records',
    align: 'right',
    sortable: true,
    sortValue: (r) => r.records,
    render: (r) => r.records.toLocaleString('en-LK'),
  }
  const source: Column<ExpenseTableRow> = {
    key: 'source',
    header: 'Source',
    sortable: true,
    sortValue: (r) => r.source ?? '',
    render: (r) =>
      !r.source ? null : r.href ? (
        <Link to={r.href} onClick={(e) => e.stopPropagation()} className="text-xs font-medium text-primary hover:underline">
          {r.source} →
        </Link>
      ) : (
        <StatusBadge tone={SOURCE_TONE[r.source]}>{r.source}</StatusBadge>
      ),
  }
  if (by === 'entry') {
    return [
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        className: 'whitespace-nowrap',
        sortValue: (r) => r.date ?? '',
        render: (r) => (r.key === 'total' ? 'Total' : r.date ? formatDate(r.date) : ''),
      },
      {
        key: 'category',
        header: 'Category',
        sortable: true,
        sortValue: (r) => r.category ?? '',
        render: (r) => r.category ?? '',
      },
      {
        key: 'description',
        header: 'Description',
        minWidth: 260,
        render: (r) =>
          r.key === 'total' ? null : (
            <div>
              <p className="text-text">{r.description}</p>
              <p className="id text-xs text-text-muted">
                {r.key}
                {r.enteredBy && ` · ${r.enteredBy}`}
                {r.paidVia && ` · ${r.paidVia === 'cash' ? 'Cash' : 'Bank'}`}
              </p>
            </div>
          ),
      },
      source,
      amount,
    ]
  }
  return [
    {
      key: 'name',
      header: by === 'category' ? 'Category' : 'Month',
      minWidth: 200,
      sortable: true,
      sortValue: (r) => (by === 'month' ? r.key : r.name),
      render: (r) =>
        r.key === 'total' ? (
          'Total'
        ) : (
          <span className="flex items-center gap-2 font-medium text-text">
            {r.kind && <span className="size-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[r.kind] }} aria-hidden />}
            {r.name}
          </span>
        ),
    },
    ...(by === 'category' ? [source] : []),
    records,
    amount,
    pct,
  ]
}

/**
 * Fertilizer written off in the period. Shown for information only: the stock's cost was counted
 * when it was bought, so a write-off is never a second expense (and never in the total above).
 */
function StockLostPanel({ period, lines }: { period: string; lines: { item: string; reason: string; kg: number }[] }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-text-heading">Stock lost ({period}): information only</h3>
      <p className="mt-0.5 text-xs text-text-muted">
        Fertilizer written off. Not an expense and not in the totals above; its cost was counted when it was bought.
      </p>
      <ul className="mt-3 divide-y divide-border text-sm">
        {lines.map((l) => (
          <li key={`${l.item}-${l.reason}`} className="flex justify-between gap-4 py-1.5">
            <span className="text-text">
              {l.item} <span className="text-text-muted">· {l.reason}</span>
            </span>
            <span className="tabular text-text">{formatWeight(l.kg)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
