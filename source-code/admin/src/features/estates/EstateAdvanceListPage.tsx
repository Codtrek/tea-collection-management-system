import { useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, HandCoins, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import type { DatePreset } from '@/features/employees/advance-filters'
import * as estatesService from '@/services/estates'
import {
  DATE_PRESETS,
  ESTATE_ADVANCE_PAGE_SIZE,
  ESTATE_RECOVERY_TONE,
  estateAdvanceParams,
  estateAdvanceQuery,
  estateAdvanceRange,
  readEstateAdvanceFilters,
  RECOVERY_STATUSES,
  type EstateAdvanceFilters,
} from './estate-advance-filters'
import type { EstateAdvanceRecovery, EstateAdvanceRow } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

/*
  EST-05 — Estate Owner Advances (Estate-Owner-Advances-Addendum §3). Same pattern as Salary
  Advances: a date-issued range (default this month) — advances still pending deduction always
  show — plus search / route / status / issued-by filters, all in the URL and run server-side.
  Recovered / remaining come from the server's estate-advance-balance.ts.
*/
export function EstateAdvanceListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canIssue = can('estateAdvances', 'edit')
  const today = factoryToday()

  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEstateAdvanceFilters(searchParams)
  // ?highlight=EADV-… — set by the Issue form so the new advance stands out
  const highlight = searchParams.get('highlight') ?? undefined
  const setFilters = (patch: Partial<EstateAdvanceFilters>) =>
    setSearchParams(estateAdvanceParams({ ...filters, page: 0, ...patch }), { replace: true })
  const query = estateAdvanceQuery(filters, today)

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['estates', 'advances', query],
    queryFn: () => estatesService.listAdvances(query),
    placeholderData: keepPreviousData,
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Couldn't load advances" description="Something went wrong fetching estate advances." onRetry={() => void refetch()} />
  }

  const range = estateAdvanceRange(filters, today)
  const rangeText =
    range.from && range.to ? `${formatDate(range.from)} – ${formatDate(range.to)}` : range.from ? `from ${formatDate(range.from)}` : range.to ? `up to ${formatDate(range.to)}` : 'all dates'
  const open = (a: EstateAdvanceRow) => navigate(`/estates/advances/${a.id}`)
  const issue = () => navigate('/estates/advances/new')

  const columns: Column<EstateAdvanceRow>[] = [
    {
      key: 'estateName',
      header: 'Estate Owner',
      render: (a) => (
        <div>
          <p className="font-medium text-text">{a.estateName}</p>
          <p className="text-xs text-text-muted">
            {a.ownerName}
            {a.route && ` · ${a.route}`}
          </p>
        </div>
      ),
    },
    { key: 'id', header: 'Reference', render: (a) => <span className="id">{a.id}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => formatCurrency(a.amount) },
    { key: 'dateIssued', header: 'Issued', render: (a) => formatDate(a.dateIssued) },
    { key: 'issuedBy', header: 'Issued by' },
    { key: 'recovery', header: 'Status', render: (a) => <StatusBadge tone={ESTATE_RECOVERY_TONE[a.recovery]}>{a.recovery}</StatusBadge> },
    { key: 'recovered', header: 'Deducted', align: 'right', render: (a) => formatCurrency(a.recovered) },
    { key: 'remaining', header: 'Remaining', align: 'right', render: (a) => formatCurrency(a.remaining) },
  ]

  const { summary } = data
  const tile = 'rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-1)]'

  return (
    <div>
      <PageHeader
        title="Estate Owner Advances"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Estate Owner Advances' }]}
        actions={
          canIssue ? (
            <Button onClick={issue}>
              <Plus className="size-4" /> Issue Advance Payment
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className={tile}>
          <p className="text-xs uppercase tracking-wide text-text-muted">Total issued</p>
          <p className="tabular mt-1 text-lg font-semibold text-text-heading">{formatCurrency(summary.issued)}</p>
          <p className="text-xs text-text-muted">
            {summary.issuedCount} advance{summary.issuedCount === 1 ? '' : 's'} · {rangeText}
          </p>
        </div>
        <button type="button" className={`${tile} text-left hover:shadow-[var(--shadow-2)]`} onClick={() => setFilters({ status: 'Pending deduction' })}>
          <p className="text-xs uppercase tracking-wide text-text-muted">Pending deduction</p>
          <p className="tabular mt-1 text-lg font-semibold text-text-heading">{formatCurrency(summary.pendingDeduction)}</p>
          <p className="text-xs text-text-muted">
            {summary.pendingCount} advance{summary.pendingCount === 1 ? '' : 's'} · any date
          </p>
        </button>
        <div className={tile}>
          <p className="text-xs uppercase tracking-wide text-text-muted">Total deducted</p>
          <p className="tabular mt-1 text-lg font-semibold text-text-heading">{formatCurrency(summary.deducted)}</p>
          <p className="text-xs text-text-muted">by settlements processed {rangeText}</p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_170px_170px_180px_170px]">
        <Input
          aria-label="Search advances"
          placeholder="Search estate, owner or EADV- reference…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
        <Select aria-label="Issued" value={filters.preset} onChange={(e) => setFilters({ preset: e.target.value as DatePreset })} options={DATE_PRESETS} />
        <Select
          aria-label="Route"
          placeholder="All routes"
          value={filters.route}
          onChange={(e) => setFilters({ route: e.target.value })}
          options={data.routes.map((r) => ({ value: String(r.id), label: r.name }))}
        />
        <Select
          aria-label="Status"
          placeholder="All statuses"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as EstateAdvanceRecovery | '' })}
          options={RECOVERY_STATUSES.map((s) => ({ value: s, label: s }))}
        />
        <Select
          aria-label="Issued by"
          placeholder="Anyone"
          value={filters.issuedBy}
          onChange={(e) => setFilters({ issuedBy: e.target.value })}
          options={data.issuers.map((n) => ({ value: n, label: n }))}
        />
      </div>

      {filters.preset === 'custom' && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Input type="date" label="From" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} />
          <Input type="date" label="To" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} />
        </div>
      )}

      <p className="mb-2 flex items-center gap-2 text-xs text-text-muted">
        Issued {rangeText}, plus every advance still pending deduction.
        {isFetching && <Loader2 className="size-3.5 animate-spin" aria-label="Updating" />}
      </p>

      <DataTable
        columns={columns}
        rows={data.rows}
        rowKey={(a) => a.id}
        highlightRowKey={highlight}
        onRowClick={open}
        serverPage={{
          page: data.page,
          pageSize: ESTATE_ADVANCE_PAGE_SIZE,
          total: data.total,
          onPageChange: (p) => setSearchParams(estateAdvanceParams({ ...filters, page: p }), { replace: true }),
        }}
        emptyState={
          <EmptyState
            icon={<HandCoins className="size-6" strokeWidth={1.5} />}
            title="No advances here"
            description={`No estate advances match these filters (${rangeText}).`}
            action={canIssue ? <Button size="sm" onClick={issue}>Issue Advance</Button> : undefined}
          />
        }
        actions={(a) => (
          <Button size="sm" variant="secondary" onClick={() => open(a)}>
            View
          </Button>
        )}
      />
    </div>
  )
}
