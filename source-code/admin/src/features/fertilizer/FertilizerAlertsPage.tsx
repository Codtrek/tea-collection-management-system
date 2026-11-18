import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertOctagon, CalendarClock, CheckCircle2, Eye, ListChecks, Loader2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { AlertList, type AlertListItem, type AlertSection } from '@/components/patterns/AlertList'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatCard } from '@/components/data/StatCard'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import * as fertilizerService from '@/services/fertilizer'
import { coverLabel, queueHref } from './lib'
import type { ExpiryAlertBatch } from './types'
import { WriteOffModal } from './WriteOffModal'
import { formatDate, formatNumber, formatWeight } from '@/lib/format'

/* FERT-04 — Expiry Alerts (Fertilizer-Delivery-Addendum §5.2). Everything here comes from
   `GET /fertilizer/alerts` — the stock-position service buckets the batches on the factory
   calendar and works out what each usable batch can cover; nothing is recomputed on this page.
   There is deliberately no dispatch action: expired stock is written off, never dispatched,
   and usable stock reaches owners only through the request → approval → handover flow. */

export function FertilizerAlertsPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canAct = can('fertilizer', 'edit')
  const [writingOff, setWritingOff] = useState<ExpiryAlertBatch | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['fertilizer', 'alerts'],
    queryFn: fertilizerService.getExpiryAlerts,
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Couldn't load fertilizer alerts"
        description="Something went wrong fetching the expiry alerts."
        onRetry={() => void refetch()}
      />
    )
  }

  const { summary, soonDays, windowDays } = data
  const sections: AlertSection[] = [
    {
      id: 'expired',
      label: 'Expired: write off',
      tone: 'critical',
      note: 'Expired stock is never dispatched. Write it off; a batch still allocated to a request must be moved to live stock first.',
    },
    {
      id: 'soon',
      label: `Expires within ${soonDays} days: use first`,
      tone: 'warning',
      note: 'Approvals already take the earliest-expiring batch first (FEFO), so these go out ahead of newer stock.',
    },
    {
      id: 'later',
      label: `Expires in ${soonDays + 1}–${windowDays} days`,
      tone: 'warning',
      note: 'FEFO uses these after the batches above.',
    },
  ]

  const items: AlertListItem[] = data.batches.map((b) => {
    const days = b.daysToExpiry
    const expired = b.bucket === 'expired'
    const blocked = expired && b.allocatedTo.length > 0
    const when = expired
      ? `Expired ${formatDate(b.expiryDate)} (${-days} ${days === -1 ? 'day' : 'days'} ago)`
      : days === 0
        ? `Expires today — ${formatDate(b.expiryDate)}`
        : `Expires in ${days} ${days === 1 ? 'day' : 'days'} — ${formatDate(b.expiryDate)}`
    const cover = coverLabel(b.cover)

    return {
      key: b.id,
      section: b.bucket,
      urgency: expired ? 'critical' : 'warning',
      title: `${b.item} — ${b.id}`,
      badges: blocked ? (
        <StatusBadge tone="danger" icon={<AlertOctagon />}>
          Allocated stock expired: move to live stock
        </StatusBadge>
      ) : undefined,
      detail: [
        when,
        b.lotNumber && `Lot ${b.lotNumber}`,
        cover,
        blocked && `still allocated to ${b.allocatedTo.map((a) => `${a.requestId} (${formatWeight(a.kg)})`).join(', ')}`,
      ]
        .filter(Boolean)
        .join(' · '),
      meta: formatWeight(b.quantityKg),
      actions: (
        <>
          {blocked &&
            b.allocatedTo.map((a) => (
              <Link
                key={a.requestId}
                to={`/fertilizer/requests/${a.requestId}`}
                className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                Open {a.requestId}
              </Link>
            ))}
          {!expired && (
            <Button size="sm" variant="secondary" onClick={() => navigate(queueHref({ tab: 'all', item: b.item, scope: 'open' }))}>
              <ListChecks className="size-4" /> View requests that can use this batch
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => navigate(`/fertilizer/${b.id}`)}>
            <Eye className="size-4" /> View batch
          </Button>
          {canAct && expired && (
            <Button size="sm" variant="ghost" onClick={() => setWritingOff(b)}>
              <Trash2 className="size-4" /> Write off
            </Button>
          )}
        </>
      ),
    }
  })

  const cardNote = (s: { count: number; kg: number }) =>
    s.count === 0 ? 'none' : `${s.count} ${s.count === 1 ? 'batch' : 'batches'} · ${formatWeight(s.kg)}`

  return (
    <div>
      <PageHeader
        title="Expiry Alerts"
        description={`As of ${formatDate(data.today)} (factory calendar). Each batch appears in one section only.`}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: 'Alerts' },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Expired"
          value={summary.expired.kg}
          format={formatWeight}
          note={cardNote(summary.expired)}
          icon={<AlertOctagon className="size-4" />}
          tone={summary.expired.count > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={`Expiring within ${soonDays} days`}
          value={summary.soon.kg}
          format={formatWeight}
          note={cardNote(summary.soon)}
          icon={<CalendarClock className="size-4" />}
          tone={summary.soon.count > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={`Expiring in ${soonDays + 1}–${windowDays} days`}
          value={summary.later.kg}
          format={formatWeight}
          note={cardNote(summary.later)}
          icon={<CalendarClock className="size-4" />}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" strokeWidth={1.5} />}
          title="No fertilizer expired or nearing expiry"
          description={`Alerts appear here when stock comes within ${formatNumber(windowDays)} days of expiry.`}
        />
      ) : (
        <AlertList items={items} sections={sections} />
      )}

      {writingOff && (
        <WriteOffModal batch={writingOff} blockedBy={writingOff.allocatedTo} onClose={() => setWritingOff(null)} />
      )}
    </div>
  )
}
