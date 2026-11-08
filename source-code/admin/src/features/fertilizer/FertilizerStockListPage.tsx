import { useMemo, useRef, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, PhoneCall, BellRing, TrendingDown, ClipboardList, Truck, AlertTriangle, ShoppingCart, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/context/AuthContext'
import * as fertilizerService from '@/services/fertilizer'
import { StockPositionTable } from './StockPositionTable'
import { SummaryCard } from './SummaryCard'
import {
  CANT_MEET,
  committedSummary,
  hasStaleCommitment,
  holdsStock,
  itemsBelowDemand,
  queueHref,
  readStockFilters,
  requestsToDecide,
  shortfalls,
  stockParams,
  stockRows,
  type StockFilters,
} from './lib'
import type { CoverageStatus } from './types'
import { formatCurrency, formatDate, formatWeight } from '@/lib/format'

const COVERAGE_STATUSES: CoverageStatus[] = ['Out of stock', 'Short', 'Fully committed', 'Expiring soon', 'Healthy']

/*
  FERT-01 — Fertilizer Stock Position (addendum §5). Item-level, because staff ask
  "do I have enough Urea?", not "how much of batch FB-2291". On hand ≠ Available;
  the whole page hangs on that. Manager is view-only (§8.1.7).
*/
export function FertilizerStockListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canLog = can('fertilizer', 'edit')

  // the table's filters live in the URL, so card 1 can open them and Back keeps them
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readStockFilters(searchParams)
  const setFilters = (patch: Partial<StockFilters>) =>
    setSearchParams(stockParams({ ...filters, ...patch }), { replace: true })
  const tableRef = useRef<HTMLDivElement>(null)

  const {
    data: positions,
    isPending: positionsPending,
    isError: positionsError,
    refetch: refetchPositions,
  } = useQuery({ queryKey: ['fertilizer', 'positions'], queryFn: fertilizerService.listPositions })
  const {
    data: requests,
    isPending: requestsPending,
    isError: requestsError,
    refetch: refetchRequests,
  } = useQuery({ queryKey: ['fertilizer', 'requests'], queryFn: fertilizerService.listRequests })

  const { search, category, coverage } = filters
  const rows = useMemo(() => stockRows(positions ?? [], { search, category, coverage }), [positions, search, category, coverage])

  if (positionsPending || requestsPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (positionsError || requestsError || !positions || !requests) {
    return (
      <ErrorState
        title="Couldn't load the fertilizer stock position"
        description="Something went wrong fetching stock and request data."
        onRetry={() => {
          void refetchPositions()
          void refetchRequests()
        }}
      />
    )
  }

  // Every card counts with the same lib.ts function the list it opens filters with, so the number
  // and the list can't disagree. Stock figures themselves come from the server's positions.
  const below = itemsBelowDemand(positions)
  const toDecide = requestsToDecide(requests)
  const toDecideKg = toDecide.reduce((s, r) => s + r.quantityKg, 0)
  const committed = committedSummary(positions, requests)
  const committedByItem = positions.filter((p) => p.committed > 0)
  const stale = requests.filter(hasStaleCommitment)
  const staleKg = stale.reduce((s, r) => s + r.staleCommittedKg, 0)
  const shortfallList = shortfalls(positions)
  const shortfallKg = shortfallList.reduce((s, r) => s + r.shortfallKg, 0)

  const showCantMeet = () => {
    setSearchParams(stockParams({ search: '', category: '', coverage: CANT_MEET }), { replace: true })
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <PageHeader
        title="Fertilizer Stock Position"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Fertilizer Inventory' }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/fertilizer/alerts')}>
              <BellRing className="size-4" /> Expiry Alerts
            </Button>
            {canLog && (
              <>
                <Button variant="secondary" onClick={() => navigate('/fertilizer/requests/new')}>
                  <PhoneCall className="size-4" /> Log Phoned-in Request
                </Button>
                <Button onClick={() => navigate('/fertilizer/movement/new')}>
                  <Plus className="size-4" /> Log Stock Movement
                </Button>
              </>
            )}
          </>
        }
      />

      {/* Position summary — each card is a decision, not a statistic (§5.1); each opens what it counts */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<TrendingDown className="size-4" />}
          label="Items that can't meet pending requests"
          value={`${below.length} of ${positions.length}`}
          note={below.length ? below.map((p) => p.item).join(', ') : 'All items covered'}
          tone={below.length ? 'danger' : 'success'}
          rule="Items whose status is Out of stock or Short: pending requests ask for more than is Available (or Available is below zero)."
          onOpen={showCantMeet}
          openLabel="Show these items in the stock table"
        />
        <SummaryCard
          icon={<ClipboardList className="size-4" />}
          label="Requests pending approval"
          value={String(toDecide.length)}
          note={`${formatWeight(toDecideKg)} total`}
          rule="Requests in Requested or Awaiting manager approval status: the “To decide” tab."
          onOpen={() => navigate(queueHref({ tab: 'decide' }))}
          openLabel="Open the To decide tab"
          preview={
            <PreviewList
              empty="Nothing waiting for a decision."
              rows={toDecide.slice(0, 5).map((r) => ({
                key: r.id,
                to: `/fertilizer/requests/${r.id}`,
                left: (
                  <>
                    <span className="font-medium text-text">{r.estateName}</span> · {r.item}
                  </>
                ),
                right: `${formatWeight(r.quantityKg)} · ${formatDate(r.requestedDate)}`,
              }))}
              viewAll={toDecide.length ? { to: queueHref({ tab: 'decide' }), label: `View all ${toDecide.length}` } : undefined}
            />
          }
        />
        <SummaryCard
          icon={<Truck className="size-4" />}
          label="Committed, awaiting dispatch"
          value={formatWeight(committed.kg)}
          note={`${formatCurrency(committed.valueRs)} · ${committed.count} requests`}
          rule="Stock held by active allocations for requests not yet handed over, in any status (Approved, Ready for dispatch, Rescheduled, Needs review, Awaiting manager approval). Valued at each request's approval-time price."
          onOpen={() => navigate(queueHref({ tab: 'all', scope: 'holding' }))}
          openLabel="Open the requests holding this stock"
          preview={
            <PreviewList
              empty="Nothing committed."
              rows={committedByItem.map((p) => ({ key: p.item, left: p.item, right: formatWeight(p.committed) }))}
              total={committedByItem.length ? formatWeight(committed.kg) : undefined}
              warning={
                stale.length ? (
                  <>
                    {formatWeight(staleKg)} on an expired batch ({stale.length} {stale.length === 1 ? 'request' : 'requests'}:{' '}
                    {stale.map((r, n) => (
                      <span key={r.id}>
                        {n > 0 && ', '}
                        <Link to={`/fertilizer/requests/${r.id}`} className="id underline underline-offset-2">
                          {r.id}
                        </Link>
                      </span>
                    ))}
                    ): move to live stock
                  </>
                ) : undefined
              }
              viewAll={committed.count ? { to: queueHref({ tab: 'all', scope: 'holding' }), label: `View all ${committed.count}` } : undefined}
            />
          }
        />
        <SummaryCard
          icon={<AlertTriangle className="size-4" />}
          label="Shortfall to fulfil approved"
          value={shortfallKg ? formatWeight(shortfallKg) : 'Fully covered'}
          note={
            shortfallKg
              ? shortfallList.map((s) => `${s.item} ${formatWeight(s.shortfallKg)}`).join(' · ')
              : 'All approved requests can be met'
          }
          tone={shortfallKg ? 'danger' : 'success'}
          rule={
            shortfallKg
              ? 'Items where stock committed to requests is more than live On Hand (Available below zero), usually because a committed batch has expired.'
              : 'All approved requests can be met from live stock.'
          }
          preview={
            shortfallKg ? (
              <PreviewList
                empty=""
                rows={shortfallList.flatMap((s) => [
                  { key: s.item, left: <span className="font-medium text-text">{s.item}</span>, right: `${formatWeight(s.shortfallKg)} missing` },
                  ...requests
                    .filter((r) => r.item === s.item && hasStaleCommitment(r) && holdsStock(r))
                    .map((r) => ({
                      key: r.id,
                      to: `/fertilizer/requests/${r.id}`,
                      left: <span className="pl-3">{r.id} · {r.estateName}</span>,
                      right: `${formatWeight(r.staleCommittedKg)} on expired stock`,
                    })),
                ])}
              />
            ) : undefined
          }
        />
      </div>

      {/* Shortfall panel — only when a shortfall exists (§5.3) */}
      {shortfallList.length > 0 && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-danger/30 bg-danger-bg/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="size-4 text-danger-fg" />
            <h2 className="text-sm font-semibold text-text-heading">Shortfall to fulfil approved requests</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {shortfallList.map((s) => (
              <li key={s.item} className="flex items-center justify-between text-sm">
                <span className="text-text">
                  <span className="font-medium">{s.item}</span> — short{' '}
                  <span className="tabular font-semibold text-danger-fg">{formatWeight(s.shortfallKg)}</span> to cover
                  approved commitments
                </span>
                {canLog && (
                  <Button size="sm" variant="secondary" onClick={() => navigate('/fertilizer/movement/new')}>
                    <ShoppingCart className="size-4" /> Order more
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div ref={tableRef} className="mb-4 grid scroll-mt-20 gap-3 sm:grid-cols-[1fr_180px_220px]">
        <Input placeholder="Search item…" value={search} onChange={(e) => setFilters({ search: e.target.value })} />
        <Select
          placeholder="All categories"
          value={category}
          onChange={(e) => setFilters({ category: e.target.value })}
          options={['Fertilizer', 'Beneficiary'].map((c) => ({ value: c, label: c }))}
        />
        <Select
          placeholder="All coverage"
          value={coverage}
          onChange={(e) => setFilters({ coverage: e.target.value })}
          options={[
            { value: CANT_MEET, label: "Can't meet pending (Out of stock + Short)" },
            ...COVERAGE_STATUSES.map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" strokeWidth={1.5} />}
          title="No items match your filters"
          description="Adjust the search or filters to see stock positions."
        />
      ) : (
        <StockPositionTable positions={rows} canLog={canLog} />
      )}
    </div>
  )
}

/** The rows inside a card's preview: a short list, an optional total / warning, and "View all". */
function PreviewList({
  rows,
  empty,
  total,
  warning,
  viewAll,
}: {
  rows: { key: string; left: ReactNode; right: string; to?: string }[]
  empty: string
  total?: string
  warning?: ReactNode
  viewAll?: { to: string; label: string }
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <p className="text-text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.key} className="flex items-baseline justify-between gap-3 py-1">
              <span className="min-w-0 truncate text-text-muted">
                {r.to ? (
                  <Link to={r.to} className="hover:text-primary hover:underline">
                    {r.left}
                  </Link>
                ) : (
                  r.left
                )}
              </span>
              <span className="tabular shrink-0 text-text">{r.right}</span>
            </li>
          ))}
          {total && (
            <li className="flex justify-between gap-3 py-1 font-semibold text-text-heading">
              <span>Total</span>
              <span className="tabular">{total}</span>
            </li>
          )}
        </ul>
      )}
      {warning && <p className="rounded-[var(--radius-sm)] bg-danger-bg px-2 py-1.5 text-danger-fg">{warning}</p>}
      {viewAll && (
        <Link to={viewAll.to} className="self-end font-medium text-primary hover:underline">
          {viewAll.label} →
        </Link>
      )}
    </div>
  )
}
