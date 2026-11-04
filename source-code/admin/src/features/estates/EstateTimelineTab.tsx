import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ReportActionsBar } from '@/features/reports/ReportViewer'
import * as estatesService from '@/services/estates'
import type { TimelinePage } from './types'
import { TenureRibbon, TenureRibbonRow } from './TenureRibbon'
import { formatCurrency, formatDate } from '@/lib/format'

/*
  EST-10 — the unified timeline (addendum §5). Right now a delivery, a
  fertilizer approval, and a settlement live in three unrelated tabs; merged
  into one reverse-chronological feed they become a history. The ribbon
  (TenureRibbon) is the signature element — see that file for the design
  rationale (§6.4).
*/

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Delivery', label: 'Deliveries' },
  { value: 'Settlement', label: 'Payments' },
  { value: 'Fertilizer', label: 'Fertilizer' },
  { value: 'Advance', label: 'Advances' },
  { value: 'Account', label: 'Account' },
]

const PAGE_SIZE = 25

export function EstateTimelineTab({ estateId }: { estateId: string }) {
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[180px_150px_150px_1fr]">
        <Select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)} options={TYPE_FILTERS} />
        <input
          type="date"
          aria-label="From date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        />
        <input
          type="date"
          aria-label="To date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        />
      </div>

      {/* `key` remounts the feed on a filter change — React's own "reset
          state when a value changes" idiom (see React docs). A fresh mount
          means fresh page/entries state with no manual reset effect, and is
          also *why* the first 6 entries fading in again on a filter change is
          a legitimate "first load" of this view, not a replay. */}
      <TimelineFeed key={`${type}|${from}|${to}`} estateId={estateId} type={type} from={from} to={to} />
    </div>
  )
}

function TimelineFeed({ estateId, type, from, to }: { estateId: string; type: string; from: string; to: string }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [entries, setEntries] = useState<TimelinePage['entries']>([])
  const [seededData, setSeededData] = useState<TimelinePage | undefined>(undefined)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['estates', estateId, 'timeline', type, from, to, page],
    queryFn: () =>
      estatesService.getTimeline(estateId, { type: type || undefined, from: from || undefined, to: to || undefined, page, limit: PAGE_SIZE }),
  })

  // Render-time accumulation ("adjust state during render", not an effect) —
  // safe because the parent's `key` guarantees this component only ever sees
  // one filter combo's own page sequence, and the `data !== seededData` guard
  // makes it idempotent (React's documented pattern for this).
  if (data && data !== seededData) {
    setSeededData(data)
    setEntries((prev) => (page === 0 ? data.entries : [...prev, ...data.entries]))
  }

  if (isPending && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError && entries.length === 0) {
    return <ErrorState title="Couldn't load the timeline" onRetry={() => void refetch()} />
  }

  if (entries.length === 0) {
    return <EmptyState title="Nothing yet beyond registration" description="Deliveries and settlements will appear here as they happen." />
  }

  return (
    <div className="flex flex-col gap-4">
      <TenureRibbon>
        {entries.map((entry, i) => (
          <TenureRibbonRow key={entry.id} entry={entry}>
            {/* Capped at the first 6 (§6.5) — "load more" appends always land
                past index 6, so this alone keeps a 6-year feed from animating
                hundreds of rows in. */}
            <div className={i < 6 ? 'animate-fade-up' : undefined} style={i < 6 ? { animationDelay: `${i * 40}ms` } : undefined}>
              <button
                type="button"
                disabled={!entry.recordHref}
                onClick={() => entry.recordHref && navigate(entry.recordHref)}
                className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-left disabled:cursor-default"
              >
                <span className="text-sm text-text">
                  {entry.description}
                  {entry.recordHref && <span className="ml-1.5 text-xs text-primary underline-offset-2 hover:underline">View</span>}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  {entry.value !== undefined && <span className="tabular">{formatCurrency(entry.value)}</span>}
                  <span className="tabular">{formatDate(entry.date)}</span>
                </span>
              </button>
            </div>
          </TenureRibbonRow>
        ))}
      </TenureRibbon>

      {data?.hasMore && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} loading={isPending && page > 0}>
            Load more
          </Button>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <ReportActionsBar />
      </div>
    </div>
  )
}
