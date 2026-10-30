import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, Eye, Loader2, Trash2, Truck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { AlertList, type AlertListItem } from '@/components/patterns/AlertList'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatCard } from '@/components/data/StatCard'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as fertilizerService from '@/services/fertilizer'
import { batchStatus, daysToExpiry, remainderOf } from './lib'
import type { FertilizerBatch, FertilizerRequest } from './types'
import { formatDate, formatNumber, formatWeight } from '@/lib/format'

/* FERT-04 — home screen for the "Low/Expiring Fertilizer Stock" notification (§15).
   Amended per addendum §8: each expiring batch shows whether it can cover open demand,
   and batches with NO matching demand (genuine write-off risk) sort to the top. */

/** Open demand (submitted + approved-undispatched) for an item — the batch can help fulfil this. */
function openDemandFor(item: string, requests: FertilizerRequest[]): { count: number; kg: number } {
  const open = requests.filter(
    (r) => r.item === item && (r.status === 'Submitted' || r.status === 'Approved' || r.status === 'Partially Dispatched'),
  )
  const kg = open.reduce((sum, r) => sum + (r.status === 'Submitted' ? r.quantityKg : remainderOf(r)), 0)
  return { count: open.length, kg }
}

export function FertilizerAlertsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canAct = can('fertilizer', 'edit')
  const [discarding, setDiscarding] = useState<FertilizerBatch | null>(null)

  const {
    data: batches,
    isPending: batchesPending,
    isError: batchesError,
    refetch: refetchBatches,
  } = useQuery({ queryKey: ['fertilizer', 'batches'], queryFn: fertilizerService.listBatches })
  const {
    data: requests,
    isPending: requestsPending,
    isError: requestsError,
    refetch: refetchRequests,
  } = useQuery({ queryKey: ['fertilizer', 'requests'], queryFn: fertilizerService.listRequests })

  const discardMutation = useMutation({
    mutationFn: (id: string) => fertilizerService.discardBatch(id),
    onSuccess: (updated) => {
      toast(`${updated.id} marked as discarded`, 'warning')
      setDiscarding(null)
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not discard this batch', 'danger'),
  })

  if (batchesPending || requestsPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (batchesError || requestsError || !batches || !requests) {
    return (
      <ErrorState
        title="Couldn't load fertilizer alerts"
        description="Something went wrong fetching stock and request data."
        onRetry={() => {
          void refetchBatches()
          void refetchRequests()
        }}
      />
    )
  }

  const expiring = batches.filter((b) => !b.discarded && daysToExpiry(b) <= 30).sort((a, b) => {
    // Critical (≤7d) first; within a group, no-matching-demand (write-off risk) first; then soonest expiry.
    const critRank = (x: FertilizerBatch) => (daysToExpiry(x) <= 7 ? 0 : 1)
    if (critRank(a) !== critRank(b)) return critRank(a) - critRank(b)
    const demandRank = (x: FertilizerBatch) => (openDemandFor(x.item, requests).count === 0 ? 0 : 1)
    if (demandRank(a) !== demandRank(b)) return demandRank(a) - demandRank(b)
    return daysToExpiry(a) - daysToExpiry(b)
  })

  const within7 = expiring.filter((b) => daysToExpiry(b) <= 7).length
  const within30 = expiring.length

  const items: AlertListItem[] = expiring.map((b) => {
    const days = daysToExpiry(b)
    const demand = openDemandFor(b.item, requests)
    const expiryText =
      days < 0
        ? `Expired ${formatDate(b.expiryDate)} (${batchStatus(b)})`
        : `Expires in ${days} ${days === 1 ? 'day' : 'days'} — ${formatDate(b.expiryDate)}`
    const coverageText = demand.count
      ? ` · can fulfil ${demand.count} request${demand.count > 1 ? 's' : ''} (${formatWeight(demand.kg)})`
      : ' · no matching demand — likely write-off'

    return {
      key: b.id,
      urgency: days <= 7 ? 'critical' : 'warning',
      title: `${b.item} — ${b.id}`,
      detail: expiryText + coverageText,
      meta: formatWeight(b.quantityKg),
      actions: (
        <>
          {canAct && demand.count > 0 && (
            <Button size="sm" onClick={() => navigate('/fertilizer/movement/new')}>
              <Truck className="size-4" /> Dispatch now
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => navigate(`/fertilizer/${b.id}`)}>
            <Eye className="size-4" /> View Batch
          </Button>
          {canAct && (
            <Button size="sm" variant="ghost" onClick={() => setDiscarding(b)}>
              <Trash2 className="size-4" /> Mark Discarded
            </Button>
          )}
        </>
      ),
    }
  })

  return (
    <div>
      <PageHeader
        title="Expiring Soon / Alerts"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: 'Alerts' },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:max-w-lg">
        <StatCard
          label="Expiring within 7 days"
          value={within7}
          format={formatNumber}
          icon={<CalendarClock className="size-4" />}
          tone={within7 > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Expiring within 30 days" value={within30} format={formatNumber} icon={<CalendarClock className="size-4" />} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" strokeWidth={1.5} />}
          title="No fertilizer nearing expiry"
          description="All batches are fresh. Alerts appear here when stock comes within 30 days of expiry."
        />
      ) : (
        <AlertList items={items} />
      )}

      <LightConfirmModal
        open={!!discarding}
        onClose={() => setDiscarding(null)}
        onConfirm={() => discarding && discardMutation.mutate(discarding.id)}
        tone="danger"
        title="Discard this batch"
        confirmLabel="Mark as Discarded"
        loading={discardMutation.isPending}
        message={
          <>
            <strong>{discarding?.item}</strong> ({discarding?.id}) will be removed from available stock. Reversible
            only via a new correcting entry.
          </>
        }
      />
    </div>
  )
}
