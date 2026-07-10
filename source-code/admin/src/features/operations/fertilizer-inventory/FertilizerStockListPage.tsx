import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, PhoneCall, BellRing, TrendingDown, ClipboardList, Truck, AlertTriangle, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/context/AuthContext'
import { StockPositionTable } from './StockPositionTable'
import { itemPositions, itemsBelowDemand, pendingRequests, committedSummary, shortfalls } from './position'
import type { CoverageStatus, ItemCategory } from './types'
import { formatCurrency, formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'
import SummaryCard from './components/SummaryCard'

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

  const positions = useMemo(() => itemPositions(), [])
  const rows = useMemo(
    () =>
      positions.filter((p) => {
        const q = search.trim().toLowerCase()
        return (
          p.item.toLowerCase().includes(q) &&
          (!category || p.category === (category as ItemCategory)) &&
          (!coverage || p.status === (coverage as CoverageStatus))
        )
      }),
    [positions, search, category, coverage],
  )

  const below = itemsBelowDemand()
  const pending = pendingRequests()
  const pendingKg = pending.reduce((s, r) => s + r.quantityKg, 0)
  const committed = committedSummary()
  const shortfallList = shortfalls()
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

