import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Coins,
  Info,
  Landmark,
  Minus,
  Package,
  RefreshCw,
  Scale,
  Tag,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState } from '@/components/data/ErrorState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { ComboChartCard } from '@/components/charts/ChartCard'
import { niceTicks } from '@/components/charts/ticks'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { factoryToday } from '@/features/dispatch/status'
import * as dashboardService from '@/services/dashboard'
import { formatCurrency, formatDate, formatDateTime, formatKg, formatNumber, formatPercent, formatWeight } from '@/lib/format'
import {
  activityGroups,
  activityTime,
  agentLine,
  amountsInText,
  changeText,
  greetName,
  greeting,
  intakeTakeaway,
  isRecordId,
  trend,
  updatedText,
  weekdayOf,
  windowLabel,
} from './dashboard-view'
import type { ActionGroup, ActionItem, ActivityEntry, DashboardCharts, DashboardSummary, MonthView, Section, TodayView } from './types'
import { BlockBoundary, BlockError } from '@/components/data/BlockBoundary'

/*
  Dashboard (Dashboard-Addendum). Three questions — what needs me, what is happening today, how
  the month is going — answered only from GET /dashboard/summary. Nothing here is a constant:
  every figure is another page's own number and opens that page. Which sections and items show
  is decided by the server from the role's permissions.

  Layout (≥1280 px): the work queue, then intake by day, in 8 of 12 columns; beside them one panel
  of labelled figures per section and intake by route (4). Recent activity runs full width below.
  Under 1280 px the blocks stack, queue first.
*/
export function DashboardPage() {
  const { user, can } = useAuth()
  const { toast } = useToast()
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardService.getSummary,
  })
  // re-render each minute so "Updated …" turns into a warning once the figures are old
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const refresh = async () => {
    const r = await refetch()
    if (r.isSuccess) toast('Data refreshed')
    else toast("Couldn't refresh the dashboard", 'danger')
  }
  return (
    <DashboardContent
      userName={user?.name ?? ''}
      auditLogLink={can('administration', 'view')}
      data={data}
      isPending={isPending}
      isError={isError}
      isFetching={isFetching}
      onRefresh={() => void refresh()}
      now={now}
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
  /** the "View audit log" link under Recent activity (Administration view) */
  auditLogLink?: boolean
  data: DashboardSummary | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  onRefresh: () => void
  now?: Date
}) {
  const today = data?.today ?? factoryToday(now)
  const updated = data ? updatedText(data.generatedAt, now) : null
  return (
    <div>
      <PageHeader
        title={`${greeting(now)}${userName ? `, ${greetName(userName)}` : ''}`}
        description={
          <>
            {weekdayOf(today)}, {formatDate(today)}
            {updated && (
              <>
                {' · '}
                <span className={cn(updated.stale && 'font-medium text-warning-fg')} title={data ? formatDateTime(data.generatedAt) : undefined}>
                  {updated.text}
                </span>
              </>
            )}
          </>
        }
        actions={
          <>
            <Button variant="ghost" size="sm" iconOnly onClick={onRefresh} disabled={isFetching} aria-label="Refresh data" title="Refresh data">
              <RefreshCw className={cn('size-4', isFetching && 'animate-spin motion-reduce:animate-none')} aria-hidden />
            </Button>
            {data && data.toDecide > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById('needs-action')?.scrollIntoView({ block: 'start' })}
              >
                Review approvals ({formatNumber(data.toDecide)})
              </Button>
            )}
            {data?.primaryAction && <PrimaryActionButton action={data.primaryAction} />}
          </>
        }
      />

      {/* PageHeader brings its own bottom margin: the blocks' 24px rhythm starts after it */}
      <div className="flex flex-col gap-6">
        {isPending ? (
          <DashboardSkeleton />
        ) : isError || !data ? (
          <ErrorState title="Couldn't load the dashboard" description="The figures come from the server; nothing is shown until they load." onRetry={onRefresh} />
        ) : (
          <>
            {/*
              ≥1280: queue then the intake chart on the left (8 columns); the figure panels and By
              route stacked on the right (4), spanning both rows so a short queue leaves no gap.
              Narrower: one column in reading order — queue, figures, routes, chart.
            */}
            <div className="grid gap-6 xl:grid-cols-12 xl:grid-rows-[auto_1fr] xl:items-start">
              <div className="min-w-0 xl:col-span-8">
                {/* each block keeps its own failure: a server error for its section, or a render error */}
                <Block label="the work queue" section="actions" data={data} onRetry={onRefresh}>
                  <NeedsAction items={data.actions} />
                </Block>
              </div>
              <div className="grid min-w-0 gap-6 lg:grid-cols-2 xl:col-span-4 xl:row-span-2 xl:grid-cols-1">
                <Block label="today's figures" section="today" data={data} onRetry={onRefresh}>
                  {data.todayView && <TodayPanel view={data.todayView} today={data.today} />}
                </Block>
                <Block label="this month's figures" section="month" data={data} onRetry={onRefresh}>
                  {data.monthView && <MonthPanel view={data.monthView} payrollInQueue={data.actions.some((a) => a.key === 'payrollDue')} />}
                </Block>
                {/* 1024–1279 with both panels above it: a full row, not half of one */}
                <div className={cn('min-w-0', data.todayView && data.monthView && 'lg:col-span-2 xl:col-span-1')}>
                  <Block label="intake by route" section="charts" data={data} onRetry={onRefresh}>
                    {data.charts && <RoutesCard charts={data.charts} />}
                  </Block>
                </div>
              </div>
              <div className="min-w-0 xl:col-span-8">
                <Block label="the intake charts" section="charts" data={data} onRetry={onRefresh}>
                  {data.charts && <DailyIntakeChart charts={data.charts} today={data.today} />}
                </Block>
              </div>
            </div>
            <Block label="recent activity" section="activity" data={data} onRetry={onRefresh}>
              <ActivitySection entries={data.activity} today={data.today} auditLogLink={auditLogLink} />
            </Block>
          </>
        )}
      </div>
    </div>
  )
}

/** One block: its server-side error (errors[section]) or a render error shows inline, here only. */
function Block({
  label,
  section,
  data,
  onRetry,
  children,
}: {
  label: string
  section: Section
  data: DashboardSummary
  onRetry: () => void
  children: ReactNode
}) {
  const error = data.errors[section]
  if (error) return <BlockError label={label} message={error} onRetry={onRetry} />
  return (
    <BlockBoundary label={label} onRetry={onRetry} resetKey={data.generatedAt}>
      {children}
    </BlockBoundary>
  )
}

/** The page's one primary button: the role's most urgent item's action. It only opens that list. */
function PrimaryActionButton({ action }: { action: NonNullable<DashboardSummary['primaryAction']> }) {
  const navigate = useNavigate()
  return (
    <Button size="sm" onClick={() => navigate(action.href)}>
      {action.label}
    </Button>
  )
}

/** Block-sized placeholders while the summary loads: no centre spinner, nothing moves when it lands. */
function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading the dashboard</span>
      <div className="grid gap-6 xl:grid-cols-12 xl:grid-rows-[auto_1fr] xl:items-start">
        <Card className="p-0 xl:col-span-8">
          <div className="border-b border-border px-5 py-3">
            <Skeleton className="h-5 w-40" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex min-h-14 items-center gap-3 px-5 py-2.5">
              <Skeleton className="size-8 shrink-0 rounded-[var(--radius-sm)]" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </Card>
        <Card className="p-0 xl:col-span-4 xl:row-span-2">
          <div className="border-b border-border px-5 py-3">
            <Skeleton className="h-5 w-28" />
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </Card>
        <Skeleton className="h-[404px] rounded-[var(--radius-md)] xl:col-span-8" />
      </div>
      <Skeleton className="h-56 rounded-[var(--radius-lg)]" />
    </div>
  )
}

/** The (i) beside a figure: the exact rule it follows. */
function RuleInfo({ label, rule }: { label: string; rule: ReactNode }) {
  return (
    <Popover
      align="left"
      panelClassName="w-72 p-3"
      trigger={() => (
        <span className="inline-flex items-center rounded-full text-text-muted transition-colors duration-150 ease-out hover:text-primary">
          <Info className="size-3.5" aria-hidden />
          <span className="sr-only">How “{label}” is counted</span>
        </span>
      )}
    >
      {() => <div className="text-xs font-normal text-text">{rule}</div>}
    </Popover>
  )
}

/* ── Needs your action ── */

const GROUPS: Record<ActionGroup, { title: string; tile: string; Icon: LucideIcon }> = {
  urgent: { title: 'Urgent', tile: 'bg-danger-bg text-danger-fg', Icon: AlertTriangle },
  dueSoon: { title: 'Due soon', tile: 'bg-warning-bg text-warning-fg', Icon: Clock },
  toDecide: { title: 'To decide', tile: 'bg-surface-sunken text-text-muted ring-1 ring-inset ring-border', Icon: ClipboardCheck },
}
const GROUP_ORDER: ActionGroup[] = ['urgent', 'dueSoon', 'toDecide']

/** The item's own icon (its group sets the tile colour). */
const ITEM_ICON: Record<string, LucideIcon> = {
  estatesNoBank: Landmark,
  employeesNoBank: Landmark,
  payrollDue: Users,
  settlementsToProcess: Wallet,
  salaryAdvances: Coins,
  fertilizerToDecide: Package,
  fertilizerManager: Package,
  expiredStock: Package,
  staleAllocations: Package,
  gradingCorrections: Scale,
  ungradedOld: Scale,
  payChanges: Tag,
  holidayRequests: CalendarDays,
}

function NeedsAction({ items }: { items: ActionItem[] }) {
  const groups = GROUP_ORDER.map((g) => ({ g, items: items.filter((i) => i.group === g) })).filter((x) => x.items.length > 0)
  // an item in no known group would silently vanish: fail loudly so the block shows its error
  if (groups.reduce((n, x) => n + x.items.length, 0) !== items.length) throw new Error('A queue item has no known group')
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
          <p className="px-5 py-4 text-sm text-text-muted">
            Nothing is waiting for you. Requests, approvals and fixes that need your role appear here, most urgent first.
          </p>
        ) : (
          groups.map(({ g, items: list }) => (
            <div key={g} className="border-b border-border pb-1 last:border-b-0">
              <h3 className="px-5 pb-1 pt-3 text-xs font-semibold text-text-muted">
                {GROUPS[g].title} <span className="tabular font-normal">· {list.length}</span>
              </h3>
              <ul>
                {list.map((i) => (
                  <QueueRow key={i.key} item={i} />
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>
    </section>
  )
}

/**
 * One queue row: the whole row opens the list (a stretched link on the title), and the action
 * button is its own focus stop to the same list. Nothing is decided here.
 */
function QueueRow({ item: i }: { item: ActionItem }) {
  const meta = GROUPS[i.group]
  const Icon = ITEM_ICON[i.key] ?? meta.Icon
  const title = i.label.replace(/^\d[\d,]*\s/, '')
  return (
    <li className="relative flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5 transition-colors sm:flex-nowrap duration-150 ease-out hover:bg-surface-hover has-[a:focus-visible]:bg-surface-hover motion-reduce:transition-none">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]', meta.tile)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-[calc(100%-2.75rem)] sm:basis-auto">
        <Link
          to={i.href}
          className="text-sm font-medium text-text after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand"
        >
          <span className="tabular font-semibold text-text-heading">{formatNumber(i.count)}</span> {title}
        </Link>
        {(i.reason || i.blocked) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
            {i.blocked && <StatusBadge tone="warning">Blocked</StatusBadge>}
            {i.reason && <span>{i.reason}</span>}
          </p>
        )}
      </div>
      <Link
        to={i.href}
        className="relative z-10 ml-11 inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] sm:ml-0 border border-border bg-surface px-3 text-[13px] font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-hover active:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none"
        aria-label={`${i.action}: ${i.label}`}
      >
        {i.action}
      </Link>
    </li>
  )
}

/* ── Figure panels: Today, This month ── */

function Panel({ id, title, note, children, footer }: { id: string; title: string; note: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <Card className="p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border px-5 py-3">
          <h2 id={id} className="text-base font-semibold text-text-heading">
            {title}
          </h2>
          <p className="text-xs text-text-muted">{note}</p>
        </div>
        <dl className="divide-y divide-border">{children}</dl>
        {footer && <div className="border-t border-border px-5 py-3 text-sm">{footer}</div>}
      </Card>
    </section>
  )
}

/**
 * One labelled figure. The value is a stretched link to the records behind it, so the whole row
 * opens them; the (i) stays above it as its own button.
 */
function FigureRow({
  label,
  value,
  detail,
  rule,
  href,
  openLabel,
  tone = 'default',
  extra,
}: {
  label: string
  value: string
  detail?: ReactNode
  rule: ReactNode
  href: string
  openLabel: string
  tone?: 'default' | 'danger' | 'success'
  extra?: ReactNode
}) {
  return (
    // dt and every dd are the row's direct children (valid <dl>); the grid puts the value beside the label
    <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-5 py-3 transition-colors duration-150 ease-out hover:bg-surface-hover has-[a:focus-visible]:bg-surface-hover motion-reduce:transition-none">
      <dt className="min-w-0 text-[13px] text-text-muted">
        {label}{' '}
        <span className="relative z-10 inline-flex align-[-2px]">
          <RuleInfo label={label} rule={rule} />
        </span>
      </dt>
      <dd>
        <Link
          to={href}
          aria-label={`${label}: ${value}. ${openLabel}`}
          className={cn(
            'tabular text-base font-semibold after:absolute after:inset-0 after:content-[\'\'] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand',
            tone === 'danger' ? 'text-danger-fg' : tone === 'success' ? 'text-success-fg' : 'text-text-heading',
          )}
        >
          {value}
        </Link>
      </dd>
      {detail && <dd className="col-span-2 mt-0.5 text-xs text-text-muted">{detail}</dd>}
      {extra && <dd className="col-span-2 mt-2">{extra}</dd>}
    </div>
  )
}

/** "↓ down 69.4% vs 1–18 Oct": a drawn arrow, the word and the colour together — never colour alone. */
function Trend({ changePct, against }: { changePct: number | null; against: string }) {
  const t = trend(changePct)
  if (!t) return <>Nothing to compare {against.replace(/^vs /, 'with ')}</>
  const TrendIcon = t.word === 'up' ? ArrowUp : t.word === 'down' ? ArrowDown : Minus
  return (
    <>
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-medium',
          t.word === 'up' ? 'text-success-fg' : t.word === 'down' ? 'text-warning-fg' : 'text-text',
        )}
      >
        <TrendIcon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
        {t.word === 'level' ? 'level' : `${t.word} ${t.pct}`}
      </span>{' '}
      {against}
    </>
  )
}

function TodayPanel({ view, today }: { view: TodayView; today: string }) {
  const { leaf, grading, agents, fertilizer } = view
  if (!leaf && !grading && !agents && !fertilizer) return null
  return (
    <Panel id="today-title" title="Today" note={`${weekdayOf(today)} ${formatDate(today)}, so far`}>
      {leaf && (
        <FigureRow
          label="Leaf received so far"
          value={formatWeight(leaf.kg)}
          detail={
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
          href={leaf.href}
          openLabel="Open today's Collection Report"
        />
      )}
      {grading && (
        <FigureRow
          label="Waiting for grading"
          value={formatNumber(grading.waiting)}
          detail={grading.waiting === 0 ? 'No deliveries waiting today' : 'Delivered today, not yet graded'}
          rule="Deliveries dated today with status Collected and no grade lines (the Collections list, filtered)."
          href={grading.waitingHref}
          openLabel="Open these deliveries"
        />
      )}
      {grading && grading.overTolerance > 0 && (
        <FigureRow
          label="Weight mismatches today"
          value={formatNumber(grading.overTolerance)}
          tone="danger"
          detail={`Factory and estate weight differ by more than ${grading.tolerancePct}%`}
          rule={`Today's graded deliveries whose factory weight differs from the estate's weight by more than the ${grading.tolerancePct}% tolerance (Collection Report, weight differences).`}
          href={grading.mismatchHref}
          openLabel="Open the weight differences"
        />
      )}
      {agents && (
        <FigureRow
          label="Collection agents"
          value={agents.scheduled === 0 ? '0' : `${formatNumber(agents.onRoute)} on route`}
          detail={agents.scheduled === 0 ? 'No routes scheduled today' : (agentLine(agents) ?? '')}
          rule="Each agent's status on today's Agent Dispatch board: on route, not started, absent, covering another route, or completed."
          href={agents.href}
          openLabel="Open Agent Dispatch"
        />
      )}
      {fertilizer && (
        <FigureRow
          label="Fertilizer deliveries"
          value={formatNumber(fertilizer.total)}
          tone={fertilizer.failed > 0 ? 'danger' : 'default'}
          detail={
            fertilizer.total === 0 ? 'No deliveries scheduled today' : `${fertilizer.done} done · ${fertilizer.failed} failed · ${fertilizer.pending} pending`
          }
          rule="Fertilizer requests whose latest delivery attempt is scheduled today (not cancelled). Done = delivered or partly delivered."
          href={fertilizer.href}
          openLabel="Open these requests"
        />
      )}
    </Panel>
  )
}

/** Expenses is shown with what it is made of, so nobody adds it to Leaf purchase value (decision (c)). */
const EXPENSES_INCLUDE = 'Includes leaf purchases, processed wages, fertilizer stock and daily entries'

function MonthPanel({ view, payrollInQueue }: { view: MonthView; payrollInQueue: boolean }) {
  const { intake, leafPurchase, expenses, payroll, settlements } = view
  // payroll is a queue item for roles that act on it; a summary row only for the others
  const payrollRow = payroll && !payrollInQueue
  if (!intake && !leafPurchase && !expenses && !payrollRow && !settlements) return null
  const vsWindow = intake ? `vs ${windowLabel(intake.compare)}` : 'vs last month (same days)'
  return (
    // no footer link: the Leaf intake row already opens this month's Collection Report, and By route ends with it
    <Panel id="month-title" title="This month" note={view.label}>
      {intake && (
        <FigureRow
          label="Leaf intake"
          value={formatWeight(intake.kg)}
          detail={
            intake.deliveries === 0 ? (
              'No graded deliveries this month yet'
            ) : intake.compareKg === null ? (
              'Nothing to compare with last month'
            ) : (
              <>
                <Trend changePct={intake.changePct} against={vsWindow} />
                <br />
                {intake.lastYearKg === null ? 'No deliveries this time last year' : changeText(intake.yoyPct, 'vs last year', intake.lastYearKg)}
              </>
            )
          }
          rule="Factory weight of this month's graded deliveries so far (the Collection Report, this month), compared like for like: the same days of last month and of the same month last year."
          href={intake.href}
          openLabel="Open this month's Collection Report"
        />
      )}
      {intake && intake.superShare !== null && (
        <FigureRow
          label="Super share"
          value={formatPercent(intake.superShare)}
          detail={`Super ${formatKg(intake.superKg)} · Normal ${formatKg(intake.normalKg)}`}
          rule="Super kg of all graded kg this month (the Collection Report's grade split)."
          href={intake.href}
          openLabel="Open this month's Collection Report"
          extra={
            <div className="flex h-2 overflow-hidden rounded-full bg-chart-track" aria-hidden>
              <div className="bg-chart-1" style={{ width: `${Math.min(100, Math.max(0, intake.superShare))}%` }} />
            </div>
          }
        />
      )}
      {leafPurchase && (
        <FigureRow
          label="Leaf purchase value"
          value={formatCurrency(leafPurchase.valueRs)}
          detail={
            leafPurchase.rsPerKg === null ? (
              'No priced deliveries yet'
            ) : (
              <>
                Average {formatCurrency(leafPurchase.rsPerKg)}/kg
                <br />
                <Trend changePct={leafPurchase.changePct} against={vsWindow} />
              </>
            )
          }
          rule="What this month's graded leaf is worth at the grade rate in force on each delivery date (the Leaf Purchase Report). Average Rs./kg is value ÷ priced factory kg."
          href={leafPurchase.href}
          openLabel="Open the Leaf Purchase Report"
        />
      )}
      {expenses && (
        <FigureRow
          label="Expenses to date"
          value={formatCurrency(expenses.totalRs)}
          detail={
            <>
              {EXPENSES_INCLUDE}
              <br />
              <Trend changePct={expenses.changePct} against="vs last month (same days)" />
            </>
          }
          rule="This month's expenses so far from the Expense Report: leaf purchases, processed wages, fertilizer stock bought and daily expense entries. Leaf purchases are already in it, so don't add it to Leaf purchase value."
          href={expenses.href}
          openLabel="Open the Expense Report"
        />
      )}
      {settlements && (
        <FigureRow
          label="Settlements"
          value={`${formatNumber(settlements.pending)} pending`}
          tone={settlements.transportMissing ? 'danger' : 'default'}
          detail={
            settlements.pending === 0
              ? 'Nothing waiting to be processed'
              : settlements.transportMissing
                ? 'Blocked: transport amount not set'
                : settlements.noBank > 0
                  ? `${formatNumber(settlements.noBank)} without bank details`
                  : 'Ready to process'
          }
          rule="Estate owner settlements not yet processed, in every month. A month with no transport amount can't be processed; an owner without bank details can't be paid."
          href={settlements.href}
          openLabel="Open pending settlements"
        />
      )}
      {payrollRow && (
        <FigureRow
          label="Payroll"
          value={payroll.lastMonthStatus}
          tone={payroll.lastMonthStatus === 'Processed' ? 'success' : payroll.lastMonthStatus === 'Issues to fix' ? 'danger' : 'default'}
          detail={`Last month's payroll · this month ${payroll.status.toLowerCase()}`}
          rule="The payroll page's status for last month: No payroll, Issues to fix, Ready to process or Processed. The current month stays In progress until it ends."
          href={payroll.href}
          openLabel="Open last month's payroll"
        />
      )}
    </Panel>
  )
}

/* ── Charts ── */

function DailyIntakeChart({ charts, today }: { charts: DashboardCharts; today: string }) {
  const days = charts.daily.filter((d) => d.key <= today)
  const takeaway = intakeTakeaway(days, charts.changePct, charts.lastMonthLabel, today)
  const max = Math.max(0, ...days.map((d) => Math.max(d.kg, d.lastMonthKg ?? 0)))
  const lastMonth = charts.lastMonthLabel.split(' ')[0]
  return (
    <section aria-label="Leaf intake by day">
      <ComboChartCard
        title="Leaf intake by day"
        caption={takeaway}
        ariaLabel={`Leaf intake by day this month, with ${lastMonth} on the same days. ${takeaway}`}
        data={days.map((d) => ({ label: d.label, bar: d.kg, line: d.lastMonthKg, partial: d.partial }))}
        barLabel="This month (kg)"
        lineLabel={`${lastMonth}, same day`}
        barFmt={formatKg}
        barTick={formatNumber}
        lineFmt={formatKg}
        lineTick={formatNumber}
        compareLine
        yTicks={niceTicks(max)}
        partialNote="Day in progress"
        variant="panel"
      />
    </section>
  )
}

/** All routes, demo ones included, ranked — the same rows as the Collection Report's route table. */
function RoutesCard({ charts }: { charts: DashboardCharts }) {
  const routes = [...charts.byRoute].sort((a, b) => b.kg - a.kg)
  const total = routes.reduce((s, r) => s + r.kg, 0)
  return (
    <section aria-labelledby="routes-title">
      <Card className="p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-border px-5 py-3">
          <h2 id="routes-title" className="text-base font-semibold text-text-heading">
            By route
          </h2>
          <p className="text-xs text-text-muted">kg this month · share</p>
        </div>
        {routes.length === 0 ? (
          <p className="px-5 py-4 text-sm text-text-muted">No graded deliveries on any route this month yet. Routes appear as their leaf is graded.</p>
        ) : (
          <ol className="space-y-3 px-5 py-4">
            {routes.map((r) => {
              const share = total > 0 ? (r.kg / total) * 100 : 0
              return (
                <li key={r.id ?? r.name} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-text" title={r.name}>
                      {r.name}
                    </span>
                    <span className="tabular shrink-0 text-text-heading">
                      {formatKg(r.kg)} <span className="text-xs text-text-muted">· {formatPercent(share)}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-chart-track" aria-hidden>
                    <div className="h-full rounded-full bg-chart-1" style={{ width: `${share}%` }} />
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        <div className="border-t border-border px-5 py-3 text-sm">
          <Link to={charts.href} className="font-medium text-primary hover:underline">
            Open the Collection Report →
          </Link>
        </div>
      </Card>
    </section>
  )
}

/* ── Recent activity ── */

const ACTIVITY_ROWS = 6

/** The icon for an audit entry, from what it records. */
function activityIcon(e: ActivityEntry): LucideIcon {
  const t = `${e.action} ${e.module}`
  if (/settlement/i.test(t)) return Wallet
  if (/payroll|salary|wage/i.test(t)) return Users
  if (/rate|price/i.test(t)) return Tag
  if (/stock|fertilizer|batch/i.test(t)) return Package
  if (/advance/i.test(t)) return Coins
  if (/transport|route|dispatch/i.test(t)) return Truck
  return ClipboardList
}

function ActivitySection({ entries, today, auditLogLink }: { entries: ActivityEntry[]; today: string; auditLogLink: boolean }) {
  const groups = activityGroups(entries.slice(0, ACTIVITY_ROWS), today)
  return (
    <section aria-labelledby="activity-title">
      <Card className="p-0">
        <div className="border-b border-border px-5 py-3">
          <h2 id="activity-title" className="text-base font-semibold text-text-heading">
            Recent activity
          </h2>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-4 text-sm text-text-muted">
            No recorded activity in the modules your role can see yet. Settlements, payroll runs, rate changes and stock movements appear here as they happen.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="border-b border-border pb-1 last:border-b-0">
              <h3 className="px-5 pb-1 pt-3 text-xs font-semibold text-text-muted">
                {g.title}
                {g.actor && <span className="font-normal"> · {g.actor}</span>}
              </h3>
              <ul>
                {g.entries.map((e) => {
                  const Icon = activityIcon(e)
                  return (
                    <li key={e.id} className="flex items-start gap-3 px-5 py-2">
                      <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="text-text">
                          {!g.actor && <span className="font-semibold">{e.user} </span>}
                          {amountsInText(e.action)}
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
                        {e.details && (
                          <p className="truncate text-xs text-text-muted" title={amountsInText(e.details)}>
                            {amountsInText(e.details)}
                          </p>
                        )}
                        <time dateTime={e.timestamp} className="tabular text-xs text-text-muted sm:hidden" title={formatDateTime(e.timestamp)}>
                          {activityTime(e.timestamp, g.key)}
                        </time>
                      </div>
                      <time
                        dateTime={e.timestamp}
                        className="tabular hidden shrink-0 text-xs text-text-muted sm:block"
                        title={formatDateTime(e.timestamp)}
                        aria-hidden
                      >
                        {activityTime(e.timestamp, g.key)}
                      </time>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
        {auditLogLink && (
          <div className="border-t border-border px-5 py-3 text-sm">
            <Link to="/admin/audit-logs" className="font-medium text-primary hover:underline">
              View audit log →
            </Link>
          </div>
        )}
      </Card>
    </section>
  )
}
