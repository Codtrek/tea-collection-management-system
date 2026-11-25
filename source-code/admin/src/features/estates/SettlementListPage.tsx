import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, Calculator, Download, FileDown, Loader2, Play } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { ALL_PERIODS, MonthPicker } from '@/components/patterns/MonthPicker'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as estatesService from '@/services/estates'
import { downloadCsv, toCsv } from '@/lib/csv'
import { currentMonth, monthOptionsFor, periodOf } from '@/lib/month'
import { cn } from '@/lib/cn'
import {
  hasActiveFilters,
  readSettlementFilters,
  SETTLEMENT_PAGE_SIZE,
  settlementParams,
  settlementQuery,
  type SettlementFilters,
} from './settlement-filters'
import type { SettlementRow, SettlementSummary } from './types'
import { formatCurrency } from '@/lib/format'

/*
  EST-07 — Payment Settlements by period (Settlement-Period-View-Addendum, Settlement-Addendum).
  Opens on last month (settlements are processed after a month ends); `?month=YYYY-MM` or `all`.
  Filters, sort and page live in the URL and run server-side; the summary is always the whole
  period and never counts Legacy (seed) rows. "Prepare settlements" makes the month's drafts from
  the deliveries; processed periods are read-only.
*/
export function SettlementListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const canProcess = can('estateOwners', 'edit')
  const queryClient = useQueryClient()

  const thisMonth = currentMonth()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readSettlementFilters(searchParams, thisMonth)
  // any filter change returns to the first page
  const setFilters = (patch: Partial<SettlementFilters>) =>
    setSearchParams(settlementParams({ ...filters, page: 0, ...patch }, thisMonth), { replace: true })

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['estates', 'settlements', settlementQuery(filters)],
    queryFn: () => estatesService.listSettlements(settlementQuery(filters)),
    placeholderData: keepPreviousData,
  })

  const prepare = useMutation({
    mutationFn: () => estatesService.prepareSettlements(filters.month),
    onSuccess: (run) => {
      toast(`${run.prepared} draft settlement${run.prepared === 1 ? '' : 's'} ready for ${run.period}`)
      void queryClient.invalidateQueries({ queryKey: ['estates', 'settlements'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not prepare settlements', 'danger'),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Couldn't load settlements" description="Something went wrong fetching payment settlements." onRetry={() => void refetch()} />
  }

  const { summary } = data
  const all = filters.month === ALL_PERIODS
  const periodLabel = all ? 'all periods' : periodOf(filters.month)
  const options = monthOptionsFor(thisMonth, data.months)
  // a period with nothing pending (all processed) is read-only
  const canRunProcess = canProcess && !all && summary.pending > 0
  const willPrepare = summary.willPrepare ?? 0
  const canPrepare = canProcess && !all && willPrepare > 0

  const exportCsv = async () => {
    try {
      const everything = await estatesService.listSettlements(settlementQuery(filters, 0))
      const csv = toCsv<SettlementRow>(
        [
          { header: 'Reference', value: (r) => r.id },
          { header: 'Period', value: (r) => r.period },
          { header: 'Estate', value: (r) => r.estateName },
          { header: 'Owner', value: (r) => r.ownerName },
          { header: 'Route', value: (r) => r.route },
          { header: 'Payment method', value: (r) => r.paymentMethod },
          { header: 'Gross leaf value (Rs)', value: (r) => r.gross },
          { header: 'Transport (Rs)', value: (r) => r.deductions.transport },
          { header: 'Fertilizer (Rs)', value: (r) => r.deductions.fertilizer },
          { header: 'Advances (Rs)', value: (r) => r.deductions.advances },
          { header: 'Adjustment (Rs)', value: (r) => r.adjustment },
          { header: 'Net payable (Rs)', value: (r) => r.net },
          { header: 'Status', value: (r) => r.status },
        ],
        everything.rows,
      )
      downloadCsv(`settlements-${filters.month}.csv`, csv)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not export settlements', 'danger')
    }
  }

  const sortable = (key: string) => ({ sortable: true, sortValue: () => key })
  const columns: Column<SettlementRow>[] = [
    {
      key: 'estate',
      header: 'Estate Owner',
      ...sortable('estate'),
      render: (s) => (
        <div>
          <p className="font-medium text-text">{s.estateName}</p>
          <p className="text-xs text-text-muted">
            {s.ownerName} · <span className="id">{s.id}</span>
          </p>
        </div>
      ),
    },
    { key: 'route', header: 'Route', render: (s) => s.route || '—' },
    { key: 'period', header: 'Period', ...sortable('period') },
    { key: 'gross', header: 'Gross Leaf Value', align: 'right', ...sortable('gross'), render: (s) => formatCurrency(s.gross) },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      ...sortable('deductions'),
      render: (s) => (
        <span
          title={`Transport ${formatCurrency(s.deductions.transport)} · Fertilizer ${formatCurrency(s.deductions.fertilizer)} · Advances ${formatCurrency(s.deductions.advances)}`}
        >
          {formatCurrency(s.deductionsTotal)}
        </span>
      ),
    },
    {
      key: 'net',
      header: 'Net Payable',
      align: 'right',
      ...sortable('net'),
      render: (s) => <span className={cn('font-medium', s.net <= 0 && 'text-danger-fg')}>{formatCurrency(s.net)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={statusTone(s.status)}>{statusLabel(s)}</StatusBadge>
          <span className="text-xs text-text-muted">{s.paymentMethod === 'cash' ? 'Cash' : 'Bank'}</span>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payment Settlements"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Estate Owners', to: '/estates' }, { label: 'Settlements' }]}
        description={all ? 'All periods' : `${periodLabel} settlement period`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void exportCsv()} disabled={data.total === 0}>
              <Download className="size-4" /> Export CSV
            </Button>
            {/* the bank file doesn't exist yet — say so instead of a button that does nothing */}
            <span title="Coming soon — the bank payment file isn't built yet">
              <Button variant="secondary" disabled aria-label="Generate Bank Payment File (coming soon)">
                <FileDown className="size-4" /> Generate Bank Payment File
                <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium uppercase">Coming soon</span>
              </Button>
            </span>
            {canPrepare && (
              <Button
                variant={canRunProcess ? 'secondary' : 'primary'}
                onClick={() => prepare.mutate()}
                loading={prepare.isPending}
                title={`Makes or recalculates a draft for each of ${willPrepare} estate${willPrepare === 1 ? '' : 's'} with payable deliveries`}
              >
                <Calculator className="size-4" />
                {summary.pending > 0 ? 'Recalculate' : 'Prepare'} settlements for {periodLabel}
                <span className="tabular text-xs opacity-80">
                  · {willPrepare} estate{willPrepare === 1 ? '' : 's'}
                </span>
              </Button>
            )}
            {canRunProcess && (
              <Button onClick={() => navigate(`/estates/settlements/process?month=${filters.month}`)}>
                <Play className="size-4" /> Review &amp; process {summary.pending} draft{summary.pending === 1 ? '' : 's'}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <MonthPicker
          month={filters.month}
          options={options}
          onChange={(m) => setFilters({ month: m })}
          allOption
          ariaLabel="Settlement period"
          badge={
            !all && summary.prepared > 0 ? (
              <StatusBadge tone={summary.pending > 0 ? 'warning' : 'success'}>
                {summary.pending > 0 ? `${summary.pending} pending` : 'Processed'}
              </StatusBadge>
            ) : undefined
          }
        />
        {isFetching && <Loader2 className="size-4 animate-spin text-text-muted" aria-label="Updating" />}
      </div>

      <SummaryCards summary={summary} month={filters.month} />

      {!all && summary.prepared > 0 && summary.pending === 0 && (
        <p className="mb-4 text-xs text-text-muted">Processed — this period is read-only.</p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_160px_160px_160px_auto]">
        <Input
          placeholder="Search estate, owner or SET- reference…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          aria-label="Search settlements"
        />
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
          onChange={(e) => setFilters({ status: e.target.value })}
          options={[
            { value: 'Pending', label: 'Draft' },
            { value: 'Processed', label: 'Processed' },
            { value: 'Legacy', label: 'Legacy (seed)' },
          ]}
        />
        <Select
          aria-label="Payment method"
          placeholder="Bank and cash"
          value={filters.method}
          onChange={(e) => setFilters({ method: e.target.value })}
          options={[
            { value: 'bank', label: 'Bank' },
            { value: 'cash', label: 'Cash' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Checkbox
            label="Net zero or negative"
            checked={filters.nonPositive}
            onChange={(e) => setFilters({ nonPositive: e.target.checked })}
          />
          <Checkbox
            label="No bank details"
            checked={filters.noBank}
            onChange={(e) => setFilters({ noBank: e.target.checked })}
          />
        </div>
      </div>

      {hasActiveFilters(filters) && (
        <p className="mb-2 text-xs text-text-muted">
          Showing {data.total} of {summary.prepared + summary.legacy} settlements for{' '}
          {periodLabel} ·{' '}
          <button className="text-primary hover:underline" onClick={() => setSearchParams(settlementParams({ ...filters, search: '', route: '', status: '', method: '', nonPositive: false, noBank: false, page: 0 }, thisMonth), { replace: true })}>
            Clear filters
          </button>
        </p>
      )}

      <DataTable
        columns={columns}
        rows={data.rows}
        rowKey={(s) => s.id}
        valign="top"
        onRowClick={(s) => navigate(`/estates/settlements/${s.id}`)}
        serverPage={{
          page: data.page,
          pageSize: SETTLEMENT_PAGE_SIZE,
          total: data.total,
          onPageChange: (p) => setSearchParams(settlementParams({ ...filters, page: p }, thisMonth), { replace: true }),
        }}
        serverSort={{
          key: filters.dir ? filters.sort : '',
          direction: filters.dir || null,
          onSortChange: (key, direction) => setFilters({ sort: direction ? key : '', dir: direction ?? '' }),
        }}
        emptyState={
          <EmptyState
            icon={<Banknote className="size-6" strokeWidth={1.5} />}
            title={hasActiveFilters(filters) ? 'No settlements match these filters' : `No settlements for ${periodLabel}`}
            description={hasActiveFilters(filters) ? undefined : 'Settlements are processed after a month ends.'}
            action={
              !hasActiveFilters(filters) && !all && summary.latestMonth && summary.latestMonth !== filters.month ? (
                <Button size="sm" variant="secondary" onClick={() => setFilters({ month: summary.latestMonth! })}>
                  View latest: {periodOf(summary.latestMonth)}
                </Button>
              ) : undefined
            }
          />
        }
        actions={(s) => (
          <Button size="sm" variant="secondary" onClick={() => navigate(`/estates/settlements/${s.id}`)}>
            View
          </Button>
        )}
      />
    </div>
  )
}

const statusTone = (status: SettlementRow['status']) =>
  status === 'Processed' ? 'success' : status === 'Legacy' ? 'neutral' : 'warning'

/** "Draft" for a generated pending row; "Legacy (seed)" for a seeded snapshot kept read-only. */
const statusLabel = (s: SettlementRow) =>
  s.status === 'Legacy' ? 'Legacy (seed)' : s.status === 'Pending' && s.generated ? 'Draft' : s.status

/** The whole period's figures — never the filtered rows; Legacy (seed) rows never count. */
function SummaryCards({ summary, month }: { summary: SettlementSummary; month: string }) {
  const tile = 'rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-1)]'
  const label = 'text-xs uppercase tracking-wide text-text-muted'
  const value = 'tabular mt-1 text-lg font-semibold text-text-heading'
  const d = summary.deductions
  const signed = (n: number) => `${n < 0 ? '−' : '+'} ${formatCurrency(Math.abs(n))}`
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className={tile}>
        <p className={label}>Prepared</p>
        <p className={value}>
          {summary.prepared}
          {summary.eligible !== null && <span className="text-text-muted"> / {summary.eligible}</span>}
          <span className="text-sm font-medium text-text-muted"> · Processed {summary.processed}</span>
        </p>
        {summary.legacy > 0 && (
          <p className="text-xs text-text-muted">
            {summary.legacy} Legacy (seed) row{summary.legacy === 1 ? '' : 's'} not counted
          </p>
        )}
      </div>
      <div className={tile}>
        <p className={label}>Gross leaf value</p>
        <p className={value}>{formatCurrency(summary.gross)}</p>
      </div>
      <div className={tile}>
        <p className={label}>Deductions</p>
        <p className={value}>{formatCurrency(summary.deductionsTotal)}</p>
        <dl className="tabular mt-1 grid grid-cols-[1fr_auto] gap-x-3 text-xs text-text-muted">
          <dt>Transport</dt>
          <dd className="text-right">{formatCurrency(d.transport)}</dd>
          <dt>Fertilizer</dt>
          <dd className="text-right">{formatCurrency(d.fertilizer)}</dd>
          <dt>Advances</dt>
          <dd className="text-right">{formatCurrency(d.advances)}</dd>
          {d.adjustments !== 0 && (
            <>
              <dt>Adjustments</dt>
              <dd className="text-right">{signed(d.adjustments)}</dd>
            </>
          )}
        </dl>
      </div>
      <div className={tile}>
        <p className={label}>Net payable</p>
        <p className={value}>{formatCurrency(summary.net)}</p>
      </div>
      <div className={cn(tile, (summary.notPrepared ?? 0) > 0 && 'ring-1 ring-warning-fg/20')}>
        <p className={label}>Not yet prepared</p>
        {summary.notPrepared === null ? (
          <p className="mt-1 text-sm text-text-muted">Pick a month</p>
        ) : (
          <Link
            to={`/estates/settlements/unsettled?month=${month}`}
            className={cn(value, 'block text-primary hover:underline')}
          >
            {summary.notPrepared} owner{summary.notPrepared === 1 ? '' : 's'} →
          </Link>
        )}
        <p className="text-xs text-text-muted">payable deliveries, no draft yet</p>
      </div>
    </div>
  )
}
