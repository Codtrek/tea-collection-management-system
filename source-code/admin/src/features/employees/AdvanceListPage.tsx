import { useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { HandCoins, Loader2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import * as employeesService from '@/services/employees'
import {
  ADVANCE_PAGE_SIZE,
  ADVANCE_TABS,
  advanceParams,
  advanceQuery,
  DATE_PRESETS,
  rangeOf,
  readAdvanceFilters,
  type AdvanceFilters,
  type DatePreset,
} from './advance-filters'
import { ADVANCE_TONE, RECOVERY_TONE } from './advance-status'
import { planLabel } from '@/features/advances/advance-plan'
import type { AdvanceRow } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

/*
  EMP-10 — Salary Advances (Salary-Advances-Addendum). Tabs Needs decision / Approved / Rejected
  / All; a request-date range (default this month) — except "Needs decision", which always lists
  every pending request so an old one is never hidden. Filters live in the URL and run
  server-side. Recovery status and remaining balance come from the server (advance-balance.ts).
*/
export function AdvanceListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canRequest = can('advances', 'edit')
  const today = factoryToday()

  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readAdvanceFilters(searchParams)
  const setFilters = (patch: Partial<AdvanceFilters>) =>
    setSearchParams(advanceParams({ ...filters, page: 0, ...patch }), { replace: true })
  const query = advanceQuery(filters, today)

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['employees', 'advances', query],
    queryFn: () => employeesService.listAdvances(query),
    placeholderData: keepPreviousData,
  })
  const { data: roles } = useQuery({ queryKey: ['employees', 'roles'], queryFn: employeesService.getRoles })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Couldn't load advances" description="Something went wrong fetching salary advance requests." onRetry={() => void refetch()} />
  }

  const deciding = filters.tab === 'decide'
  const range = rangeOf(filters, today)
  const rangeText =
    range.from && range.to ? `${formatDate(range.from)} – ${formatDate(range.to)}` : range.from ? `from ${formatDate(range.from)}` : range.to ? `up to ${formatDate(range.to)}` : 'all dates'
  const open = (a: AdvanceRow) => navigate(`/employees/advances/${a.id}`)

  const columns: Column<AdvanceRow>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (a) => (
        <div>
          <p className="font-medium text-text">{a.employeeName}</p>
          <p className="text-xs text-text-muted">
            {a.role}
            {a.routes.length > 0 && ` · ${a.routes.map((r) => r.name).join(', ')}`}
          </p>
        </div>
      ),
    },
    { key: 'id', header: 'Reference', render: (a) => <span className="id">{a.id}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => formatCurrency(a.amount) },
    { key: 'dateRequested', header: 'Requested', render: (a) => formatDate(a.dateRequested) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge tone={ADVANCE_TONE[a.status]}>{a.status}</StatusBadge> },
    {
      key: 'recovery',
      header: 'Recovery',
      render: (a) => (a.recovery ? <StatusBadge tone={RECOVERY_TONE[a.recovery]}>{a.recovery}</StatusBadge> : <span className="text-text-muted">—</span>),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (a) => (
        <span className="text-sm">
          {planLabel(a.plan)}
          {a.plan.startPeriod && a.status !== 'Rejected' && <span className="block text-xs text-text-muted">from {a.plan.startPeriod}</span>}
        </span>
      ),
    },
    { key: 'recovered', header: 'Recovered', align: 'right', render: (a) => (a.status === 'Approved' ? formatCurrency(a.recovered) : '—') },
    { key: 'remaining', header: 'Remaining', align: 'right', render: (a) => (a.status === 'Approved' ? formatCurrency(a.remaining) : '—') },
    {
      key: 'nextPeriod',
      header: 'Next deduction',
      render: (a) =>
        a.status === 'Approved' && a.nextPeriod ? (
          <span>
            {a.nextPeriod}
            {a.carriedForward > 0 && <span className="block text-xs text-warning-fg">{formatCurrency(a.carriedForward)} carried forward</span>}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
  ]

  const { summary } = data
  const tile = 'rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-1)]'

  return (
    <div>
      <PageHeader
        title="Salary Advances"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Salary Advances' }]}
        actions={
          canRequest ? (
            <Button onClick={() => navigate('/employees/advances/new')}>
              <Plus className="size-4" /> New Advance Request
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={tile}>
          <p className="text-xs uppercase tracking-wide text-text-muted">Requested</p>
          <p className="tabular mt-1 text-lg font-semibold text-text-heading">{formatCurrency(summary.requested)}</p>
          <p className="text-xs text-text-muted">{rangeText}</p>
        </div>
        <div className={tile}>
          <p className="text-xs uppercase tracking-wide text-text-muted">Approved</p>
          <p className="tabular mt-1 text-lg font-semibold text-text-heading">{formatCurrency(summary.approved)}</p>
          <p className="text-xs text-text-muted">{rangeText}</p>
        </div>
        <button type="button" className={`${tile} text-left hover:shadow-[var(--shadow-2)]`} onClick={() => setFilters({ tab: 'decide' })}>
          <p className="text-xs uppercase tracking-wide text-text-muted">Pending decision</p>
          <p className="tabular mt-1 text-lg font-semibold text-text-heading">{summary.pendingCount}</p>
          <p className="text-xs text-text-muted">any date</p>
        </button>
        <div className={tile}>
          <p className="text-xs uppercase tracking-wide text-text-muted">Outstanding balance</p>
          <p className="tabular mt-1 text-lg font-semibold text-text-heading">{formatCurrency(summary.outstanding)}</p>
          <p className="text-xs text-text-muted">still to recover through payroll</p>
        </div>
      </div>

      <Tabs
        tabs={ADVANCE_TABS.map((t) => ({ id: t.id, label: `${t.label} (${data.tabCounts[t.id]})` }))}
        active={filters.tab}
        onChange={(t) => setFilters({ tab: t as AdvanceFilters['tab'] })}
        className="mb-4"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_170px_190px_150px_110px_110px]">
        <Input
          aria-label="Search advances"
          placeholder="Search employee or EMP-ADV- reference…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
        <Select
          aria-label="Requested"
          value={filters.preset}
          onChange={(e) => setFilters({ preset: e.target.value as DatePreset })}
          options={DATE_PRESETS}
          disabled={deciding}
          title={deciding ? 'Needs decision lists every pending request, whatever the date' : undefined}
        />
        <Select
          aria-label="Role"
          placeholder="All roles"
          value={filters.role}
          onChange={(e) => setFilters({ role: e.target.value })}
          options={(roles?.roles ?? data.roles).map((r) => ({ value: r, label: r }))}
        />
        <Select
          aria-label="Route (agents)"
          placeholder="All routes"
          value={filters.route}
          onChange={(e) => setFilters({ route: e.target.value })}
          options={data.routes.map((r) => ({ value: String(r.id), label: r.name }))}
        />
        <Input aria-label="Minimum amount" placeholder="Min Rs." inputMode="numeric" value={filters.min} onChange={(e) => setFilters({ min: e.target.value })} />
        <Input aria-label="Maximum amount" placeholder="Max Rs." inputMode="numeric" value={filters.max} onChange={(e) => setFilters({ max: e.target.value })} />
      </div>

      {filters.preset === 'custom' && !deciding && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Input type="date" label="From" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} />
          <Input type="date" label="To" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} />
        </div>
      )}

      <p className="mb-2 flex items-center gap-2 text-xs text-text-muted">
        {deciding ? 'Every pending request, oldest first — whatever the date range.' : `Requested ${rangeText}.`}
        {isFetching && <Loader2 className="size-3.5 animate-spin" aria-label="Updating" />}
      </p>

      <DataTable
        columns={columns}
        rows={data.rows}
        rowKey={(a) => a.id}
        onRowClick={open}
        serverPage={{
          page: data.page,
          pageSize: ADVANCE_PAGE_SIZE,
          total: data.total,
          onPageChange: (p) => setSearchParams(advanceParams({ ...filters, page: p }), { replace: true }),
        }}
        emptyState={
          <EmptyState
            icon={<HandCoins className="size-6" strokeWidth={1.5} />}
            title={deciding ? 'Nothing needs a decision' : 'No advance requests here'}
            description={deciding ? 'Every advance request has been approved or rejected.' : `No requests match these filters (${rangeText}).`}
          />
        }
        actions={(a) => (
          <Button size="sm" variant={deciding ? 'primary' : 'secondary'} onClick={() => open(a)}>
            {deciding ? 'Review' : 'View'}
          </Button>
        )}
      />
    </div>
  )
}
