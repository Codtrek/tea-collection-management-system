import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Coins,
  Leaf,
  Loader2,
  Package,
  RefreshCw,
  Scale,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SummaryCard } from '@/components/data/SummaryCard'
import { ErrorState } from '@/components/data/ErrorState'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { HorizontalBarChartCard, TrendChartCard } from '@/components/charts/ChartCard'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { factoryToday } from '@/features/dispatch/status'
import * as dashboardService from '@/services/dashboard'
import { formatCurrency, formatDate, formatKg, formatNumber, formatPercent, formatRelative, formatWeight } from '@/lib/format'
import { agentLine, changeText, colomboTime, greetName, greeting, isRecordId, weekdayOf } from './dashboard-view'
import type { ActionItem, ActivityEntry, DashboardCharts, DashboardSummary, MonthView, QuickAction, TodayView } from './types'

/*
  Dashboard (Dashboard-Addendum). Three questions — what needs me, what is happening today, how
  the month is going — answered only from GET /dashboard/summary. Nothing here is a constant:
  every figure is another page's own number and opens that page. Which sections and items show
  is decided by the server from the role's permissions.
*/
export function DashboardPage() {
  const { user, can } = useAuth()
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardService.getSummary,
  })
  return (
    <DashboardContent
      userName={user?.name ?? ''}
      auditLogLink={can('administration', 'view')}
      data={data}
      isPending={isPending}
      isError={isError}
      isFetching={isFetching}
      onRefresh={() => void refetch()}
    />
  )
}

/** The page body, from the query's state — rendered on its own in tests. */
export function DashboardContent({
  userName,
  auditLogLink = false,
  data,
  isPending,
  isError,
  isFetching,
  onRefresh,
  now = new Date(),
}: {
  userName: string
  /** the "Audit log" link beside Recent activity (Administration view) */
  auditLogLink?: boolean
  data: DashboardSummary | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  onRefresh: () => void
  now?: Date
}) {
  const today = data?.today ?? factoryToday(now)
  const description = `${weekdayOf(today)}, ${formatDate(today)}${data ? ` · Updated ${colomboTime(data.generatedAt)}` : ''}`
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting(now)}${userName ? `, ${greetName(userName)}` : ''}`}
        description={description}
        actions={
          <>
            {data?.quickActions.map((a) => <QuickActionButton key={a.key} action={a} />)}
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isFetching} aria-label="Refresh the dashboard">
              <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden /> Refresh
            </Button>
          </>
        }
      />

      {isPending ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
          <span className="sr-only">Loading the dashboard</span>
        </div>
      ) : isError || !data ? (
        <ErrorState title="Couldn't load the dashboard" description="The figures come from the server; nothing is shown until they load." onRetry={onRefresh} />
      ) : (
        <>
          <NeedsAction items={data.actions} />
          {data.todayView && <TodaySection view={data.todayView} today={data.today} />}
          {data.monthView && <MonthSection view={data.monthView} />}
          {data.charts && <ChartsSection charts={data.charts} />}
          <ActivitySection entries={data.activity} auditLogLink={auditLogLink} />
        </>
      )}
    </div>
  )
}

function QuickActionButton({ action }: { action: QuickAction }) {
  const navigate = useNavigate()
  const go = () =>
    action.href.startsWith('#')
      ? document.getElementById(action.href.slice(1))?.scrollIntoView({ block: 'start' })
      : navigate(action.href)
  return (
    <Button variant="secondary" size="sm" onClick={go}>
      {action.label}
    </Button>
  )
}

function SectionTitle({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="text-base font-semibold text-text-heading">{children}</h2>
      {note && <p className="text-xs text-text-muted">{note}</p>}
    </div>
  )
}

/* ── Needs your action ── */

function NeedsAction({ items }: { items: ActionItem[] }) {
  return (
    <section id="needs-action" aria-labelledby="needs-action-title" className="scroll-mt-20">
      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 id="needs-action-title" className="text-base font-semibold text-text-heading">
            Needs your action
          </h2>
          {items.length > 0 && <StatusBadge tone="warning">{items.length === 1 ? '1 item' : `${items.length} items`}</StatusBadge>}
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-text-muted">Nothing is waiting for you. Items appear here when a request, approval or fix needs your role.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.key}>
                <Link
                  to={i.href}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <span className="tabular w-10 shrink-0 text-right text-lg font-semibold text-text-heading">{formatNumber(i.count)}</span>
                  <span className="min-w-0 flex-1 text-sm text-text">{i.label.replace(/^\d[\d,]*\s/, '')}</span>
                  <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

/* ── Today ── */

function TodaySection({ view, today }: { view: TodayView; today: string }) {
  const navigate = useNavigate()
  const { leaf, grading, agents, fertilizer } = view
  if (!leaf && !grading && !agents && !fertilizer) return null
  return (
    <section aria-labelledby="today-title">
      <SectionTitle note={`${weekdayOf(today)} ${formatDate(today)}, so far`}>
        <span id="today-title">Today</span>
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {leaf && (
          <SummaryCard
            icon={<Leaf className="size-4" aria-hidden />}
            label="Leaf received so far"
            value={formatWeight(leaf.kg)}
            note={
              leaf.deliveries === 0 ? (
                'No graded deliveries yet today'
              ) : (
                <>
                  {leaf.deliveries === 1 ? '1 delivery' : `${formatNumber(leaf.deliveries)} deliveries`} ·{' '}
                  {changeText(leaf.changePct, `vs ${weekdayOf(leaf.compareDate).slice(0, 3)} ${formatDate(leaf.compareDate)} (whole day)`, leaf.compareKg)}
                </>
              )
            }
            rule="Factory weight of today's graded deliveries (the Collection Report for today), against the same weekday last week. Deliveries waiting for grading are not in it yet."
            onOpen={() => navigate(leaf.href)}
            openLabel="Open today's Collection Report"
          />
        )}
        {grading && (
          <SummaryCard
            icon={<Scale className="size-4" aria-hidden />}
            label="Waiting for grading"
            value={formatNumber(grading.waiting)}
            note={
              grading.waiting === 0
                ? 'No deliveries waiting today'
                : grading.overTolerance > 0
                  ? `${grading.overTolerance} over the ${grading.tolerancePct}% weight tolerance today`
                  : `Delivered today, not yet graded`
            }
            rule={`Deliveries dated today with status Collected and no grade lines (the Collections list, filtered). Weight mismatches are graded deliveries whose factory weight differs from the estate's by more than ${grading.tolerancePct}%.`}
            onOpen={() => navigate(grading.waitingHref)}
            openLabel="Open these deliveries"
          />
        )}
        {agents && (
          <SummaryCard
            icon={<Truck className="size-4" aria-hidden />}
            label="Collection agents"
            value={agents.scheduled === 0 ? '0' : `${formatNumber(agents.onRoute)} on route`}
            note={agents.scheduled === 0 ? 'No routes scheduled today' : (agentLine(agents) ?? '')}
            rule="Each agent's status on today's Agent Dispatch board: on route, not started, absent, covering another route, or completed."
            onOpen={() => navigate(agents.href)}
            openLabel="Open Agent Dispatch"
          />
        )}
        {fertilizer && (
          <SummaryCard
            icon={<Package className="size-4" aria-hidden />}
            label="Fertilizer deliveries"
            value={formatNumber(fertilizer.total)}
            tone={fertilizer.failed > 0 ? 'danger' : 'default'}
            note={
              fertilizer.total === 0
                ? 'No deliveries scheduled today'
                : `${fertilizer.done} done · ${fertilizer.failed} failed · ${fertilizer.pending} pending`
            }
            rule="Fertilizer requests whose latest delivery attempt is scheduled today (not cancelled). Done = delivered or partly delivered."
            onOpen={() => navigate(fertilizer.href)}
            openLabel="Open these requests"
          />
        )}
        {grading && grading.overTolerance > 0 && (
          <SummaryCard
            icon={<AlertTriangle className="size-4" aria-hidden />}
            label="Weight mismatches today"
            value={formatNumber(grading.overTolerance)}
            tone="danger"
            note={`Factory and estate weight differ by more than ${grading.tolerancePct}%`}
            rule={`Today's graded deliveries whose factory weight differs from the estate's weight by more than the ${grading.tolerancePct}% tolerance (Collection Report, weight differences).`}
            onOpen={() => navigate(grading.mismatchHref)}
            openLabel="Open the weight differences"
          />
        )}
      </div>
    </section>
  )
}

/* ── This month ── */

function MonthSection({ view }: { view: MonthView }) {
  const navigate = useNavigate()
  const { intake, leafPurchase, expenses, payroll } = view
  if (!intake && !leafPurchase && !expenses && !payroll) return null
  return (
    <section aria-labelledby="month-title">
      <SectionTitle note={view.label}>
        <span id="month-title">This month</span>
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {intake && (
          <SummaryCard
            icon={<Leaf className="size-4" aria-hidden />}
            label="Leaf intake"
            value={formatWeight(intake.kg)}
            note={
              intake.deliveries === 0 ? (
                'No graded deliveries this month yet'
              ) : (
                <>
                  {changeText(intake.changePct, 'vs last month (same days)', intake.compareKg)}
                  <br />
                  {intake.lastYearKg === null ? 'No deliveries this time last year' : changeText(intake.yoyPct, 'vs last year', intake.lastYearKg)}
                  {intake.superShare !== null && ` · Super ${formatPercent(intake.superShare)}`}
                </>
              )
            }
            rule="Factory weight of this month's graded deliveries so far (the Collection Report, this month), compared like for like: the same days of last month and of the same month last year. Super share is Super kg of all graded kg."
            onOpen={() => navigate(intake.href)}
            openLabel="Open this month's Collection Report"
          />
        )}
        {leafPurchase && (
          <SummaryCard
            icon={<Coins className="size-4" aria-hidden />}
            label="Leaf purchase value"
            value={formatCurrency(leafPurchase.valueRs)}
            note={
              leafPurchase.rsPerKg === null
                ? 'No priced deliveries yet'
                : `Average ${formatCurrency(leafPurchase.rsPerKg)}/kg${leafPurchase.changePct === null ? '' : ` · ${formatPercent(leafPurchase.changePct, true)} vs last month (same days)`}`
            }
            rule="What this month's graded leaf is worth at the grade rate in force on each delivery date (the Leaf Purchase Report). Average Rs./kg is value ÷ priced factory kg."
            onOpen={() => navigate(leafPurchase.href)}
            openLabel="Open the Leaf Purchase Report"
          />
        )}
        {expenses && (
          <SummaryCard
            icon={<Wallet className="size-4" aria-hidden />}
            label="Expenses to date"
            value={formatCurrency(expenses.totalRs)}
            note={expenses.changePct === null ? 'Nothing to compare with last month' : `${formatPercent(expenses.changePct, true)} vs last month (same days)`}
            rule="This month's expenses so far from the Expense Report: leaf purchases, processed wages, fertilizer stock bought and daily expense entries."
            onOpen={() => navigate(expenses.href)}
            openLabel="Open the Expense Report"
          />
        )}
        {payroll && (
          <SummaryCard
            icon={<Users className="size-4" aria-hidden />}
            label="Payroll"
            value={payroll.lastMonthStatus}
            tone={payroll.lastMonthStatus === 'Processed' ? 'success' : payroll.lastMonthStatus === 'Issues to fix' ? 'danger' : 'default'}
            note={`Last month's payroll · this month ${payroll.status.toLowerCase()}`}
            rule="The payroll page's status for last month: No payroll, Issues to fix, Ready to process or Processed. The current month stays In progress until it ends."
            onOpen={() => navigate(payroll.href)}
            openLabel="Open last month's payroll"
          />
        )}
      </div>
    </section>
  )
}

/* ── Charts ── */

function ChartsSection({ charts }: { charts: DashboardCharts }) {
  return (
    <section aria-label="Intake charts" className="grid gap-4 xl:grid-cols-[3fr_2fr]">
      <TrendChartCard
        title="Daily intake this month (kg)"
        data={charts.daily.map((d) => ({
          label: d.label,
          value: d.kg,
          count: d.deliveries,
          partial: d.partial,
          compare: d.lastMonthKg,
        }))}
        valueFmt={formatKg}
        yTickFormat={formatNumber}
        showCompare
        compareLabel={charts.lastMonthLabel}
        partialNote="Day in progress"
      />
      <HorizontalBarChartCard
        title="Intake by route this month (kg)"
        data={[...charts.byRoute]
          .sort((a, b) => b.kg - a.kg)
          .map((r) => ({ name: r.name, value: r.kg, meta: r.deliveries === 1 ? '1 delivery' : `${r.deliveries} deliveries` }))}
        valueFmt={formatKg}
        tickFormat={formatNumber}
        footer={
          <Link to={charts.href} className="font-medium text-primary hover:underline">
            Open the Collection Report →
          </Link>
        }
      />
    </section>
  )
}

/* ── Recent activity ── */

function ActivitySection({ entries, auditLogLink }: { entries: ActivityEntry[]; auditLogLink: boolean }) {
  return (
    <section aria-labelledby="activity-title">
      <Card>
        <CardHeader>
          <CardTitle id="activity-title" className="text-base">
            Recent activity
          </CardTitle>
          {auditLogLink && (
            <Link to="/admin/audit-logs" className="text-sm font-medium text-primary hover:underline">
              Audit log
            </Link>
          )}
        </CardHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-text-muted">No recorded activity in the modules your role can see yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <ClipboardList className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-text">
                    <span className="font-medium">{e.user}</span> · {e.action}
                    {e.record &&
                      (e.recordHref ? (
                        <>
                          {' '}
                          <Link to={e.recordHref} className={cn('text-primary hover:underline', isRecordId(e.record) && 'id')}>
                            {e.record}
                          </Link>
                        </>
                      ) : (
                        <span className={cn(isRecordId(e.record) && 'id')}> {e.record}</span>
                      ))}
                  </p>
                  {e.details && <p className="truncate text-xs text-text-muted">{e.details}</p>}
                </div>
                <time dateTime={e.timestamp} className="shrink-0 text-xs text-text-muted" title={formatDate(e.timestamp)}>
                  {formatRelative(e.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
