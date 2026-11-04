import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { itemsBelowDemand, pendingRequests, committedSummary, shortfalls } from './lib'
import type { CoverageStatus, ItemCategory } from './types'
import { formatCurrency, formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'

/*
  FERT-01 — Fertilizer Stock Position (addendum §5). Item-level, because staff ask
  "do I have enough Urea?", not "how much of batch FB-2291". On hand ≠ Available;
  the whole page hangs on that. Manager is view-only (§8.1.7).
*/
export function FertilizerStockListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canLog = can('fertilizer', 'edit')

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [coverage, setCoverage] = useState('')

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

  const rows = useMemo(
    () =>
      (positions ?? []).filter((p) => {
        const q = search.trim().toLowerCase()
        return (
          p.item.toLowerCase().includes(q) &&
          (!category || p.category === (category as ItemCategory)) &&
          (!coverage || p.status === (coverage as CoverageStatus))
        )
      }),
    [positions, search, category, coverage],
  )

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

  const below = itemsBelowDemand(positions)
  const pending = pendingRequests(requests)
  const pendingKg = pending.reduce((s, r) => s + r.quantityKg, 0)
  const committed = committedSummary(requests)
  const shortfallList = shortfalls(positions)
  const shortfallKg = shortfallList.reduce((s, r) => s + r.shortfallKg, 0)

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

      {/* Position summary — each card is a decision, not a statistic (§5.1) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<TrendingDown className="size-4" />}
          label="Items below demand"
          value={`${below.length} of ${positions.length}`}
          note={below.length ? below.map((p) => p.item).join(', ') : 'All items covered'}
          tone={below.length ? 'danger' : 'success'}
        />
        <SummaryCard
          icon={<ClipboardList className="size-4" />}
          label="Requests pending approval"
          value={String(pending.length)}
          note={`${formatWeight(pendingKg)} total`}
          onClick={() => navigate('/fertilizer/requests')}
        />
        <SummaryCard
          icon={<Truck className="size-4" />}
          label="Committed, awaiting dispatch"
          value={formatWeight(committed.kg)}
          note={`${formatCurrency(committed.valueRs)} · ${committed.count} requests`}
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

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <Input placeholder="Search item…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          placeholder="All categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={['Fertilizer', 'Beneficiary'].map((c) => ({ value: c, label: c }))}
        />
        <Select
          placeholder="All coverage"
          value={coverage}
          onChange={(e) => setCoverage(e.target.value)}
          options={['Healthy', 'Tight', 'Short'].map((c) => ({ value: c, label: c }))}
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

type CardTone = 'default' | 'danger' | 'success'

function SummaryCard({
  icon,
  label,
  value,
  note,
  tone = 'default',
  onClick,
}: {
  icon: ReactNode
  label: string
  value: string
  note: string
  tone?: CardTone
  onClick?: () => void
}) {
  const valueColor = tone === 'danger' ? 'text-danger-fg' : tone === 'success' ? 'text-success-fg' : 'text-text-heading'
  const iconWrap =
    tone === 'danger'
      ? 'bg-danger-bg text-danger-fg'
      : tone === 'success'
        ? 'bg-success-bg text-success-fg'
        : 'bg-brand-soft text-primary'

  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'rounded-[var(--radius-lg)] bg-surface p-5 text-left shadow-[var(--shadow-1)] transition-shadow',
        onClick && 'hover:shadow-[var(--shadow-2)]',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-muted">{label}</span>
        <span className={cn('flex size-8 items-center justify-center rounded-[var(--radius-sm)]', iconWrap)}>{icon}</span>
      </div>
      <p className={cn('tabular text-[28px] font-semibold leading-none tracking-tight', valueColor)}>{value}</p>
      <p className="mt-2 text-xs text-text-muted">{note}</p>
    </Wrapper>
  )
}
