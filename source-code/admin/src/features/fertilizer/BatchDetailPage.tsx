import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Loader2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DetailPageWithTabs } from '@/components/patterns/DetailPageWithTabs'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as fertilizerService from '@/services/fertilizer'
import { batchStatus, daysToExpiry } from './lib'
import { BATCH_TONE } from './status'
import type { StockMovement } from './types'
import { formatDate, formatWeight } from '@/lib/format'

/* FERT-03 — batch detail: Overview | Movement History | Linked Dispatches. */
export function BatchDetailPage() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = can('fertilizer', 'edit')
  const [discarding, setDiscarding] = useState(false)

  const {
    data: batch,
    isPending: batchPending,
    isError: batchError,
    refetch: refetchBatch,
  } = useQuery({
    queryKey: ['fertilizer', 'batches', batchId],
    queryFn: () => fertilizerService.getBatch(batchId!),
    enabled: !!batchId,
  })
  const { data: movementsList } = useQuery({
    queryKey: ['fertilizer', 'movements'],
    queryFn: fertilizerService.listMovements,
  })

  const discardMutation = useMutation({
    mutationFn: (id: string) => fertilizerService.discardBatch(id),
    onSuccess: (updated) => {
      toast(`${updated.id} marked as discarded`, 'warning')
      setDiscarding(false)
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
      navigate('/fertilizer')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not discard this batch', 'danger'),
  })

  if (batchPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (batchError || !batch) {
    return (
      <ErrorState
        title="Batch not found"
        description={`No fertilizer batch with ID “${batchId}”.`}
        onRetry={() => void refetchBatch()}
      />
    )
  }

  const status = batchStatus(batch)
  const movements = (movementsList ?? []).filter((m) => m.batchId === batch.id)
  const dispatches = movements.filter((m) => m.type === 'Outgoing' && m.destination)

  const movementColumns: Column<StockMovement>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (m) => (
        <span className="flex items-center gap-1.5 text-sm text-text">
          {m.type === 'Incoming' ? (
            <ArrowDownToLine className="size-4 text-success-fg" aria-hidden />
          ) : (
            <ArrowUpFromLine className="size-4 text-warning-fg" aria-hidden />
          )}
          {m.type}
        </span>
      ),
    },
    { key: 'quantityKg', header: 'Quantity', align: 'right', render: (m) => formatWeight(m.quantityKg) },
    { key: 'date', header: 'Date', render: (m) => formatDate(m.date) },
    { key: 'party', header: 'From / To', render: (m) => m.supplier ?? m.destination ?? '—' },
    { key: 'recordedBy', header: 'Recorded by' },
  ]

  const dispatchColumns: Column<StockMovement>[] = [
    { key: 'destination', header: 'Destination', render: (m) => m.destination },
    { key: 'quantityKg', header: 'Quantity', align: 'right', render: (m) => formatWeight(m.quantityKg) },
    { key: 'date', header: 'Date', render: (m) => formatDate(m.date) },
    { key: 'linkedRequest', header: 'Request', render: (m) => <span className="id text-xs">{m.linkedRequest ?? 'Ad-hoc'}</span> },
  ]

  return (
    <div>
      <PageHeader
        title={batch.item}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: batch.id },
        ]}
        actions={
          canEdit && !batch.discarded ? (
            <>
              <Button variant="secondary" onClick={() => navigate(`/fertilizer/movement/new?batch=${batch.id}`)}>
                <ArrowLeftRight className="size-4" /> Log Movement
              </Button>
              <Button variant="secondary" onClick={() => setDiscarding(true)}>
                <Trash2 className="size-4" /> Mark as Expired / Discard
              </Button>
            </>
          ) : undefined
        }
      />

      <DetailPageWithTabs
        header={
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="id text-xs text-text-muted">{batch.id}</p>
              <h2 className="text-lg font-semibold text-text-heading">{batch.item}</h2>
            </div>
            <div className="text-right">
              <p className="tabular text-2xl font-semibold text-text-heading">{formatWeight(batch.quantityKg)}</p>
              <p className="text-xs text-text-muted">in stock — {batch.location}</p>
            </div>
            <StatusBadge tone={BATCH_TONE[status]}>{status}</StatusBadge>
          </div>
        }
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
                <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  <InfoRow label="Supplier" value={batch.supplier} />
                  <InfoRow label="Lot number" value={batch.lotNumber} mono />
                  <InfoRow label="Received" value={formatDate(batch.receivedDate)} />
                  <InfoRow
                    label="Expires"
                    value={`${formatDate(batch.expiryDate)}${status !== 'Discarded' && daysToExpiry(batch) >= 0 ? ` (in ${daysToExpiry(batch)} days)` : ''}`}
                  />
                  <InfoRow label="Storage location" value={batch.location} />
                  <InfoRow label="Quality notes" value={batch.qualityNotes ?? '—'} />
                </dl>
                {batch.lastUpdatedBy && (
                  <p className="mt-4 border-t border-border pt-3 text-xs text-text-muted">
                    Last updated by {batch.lastUpdatedBy} on {batch.lastUpdatedOn && formatDate(batch.lastUpdatedOn)}
                  </p>
                )}
              </div>
            ),
          },
          {
            id: 'movements',
            label: 'Movement History',
            content: (
              <DataTable
                columns={movementColumns}
                rows={movements}
                rowKey={(m) => m.id}
                emptyState={<EmptyState title="No movements yet" description="Incoming and outgoing entries appear here." />}
              />
            ),
          },
          {
            id: 'dispatches',
            label: 'Linked Dispatches',
            content: (
              <DataTable
                columns={dispatchColumns}
                rows={dispatches}
                rowKey={(m) => m.id}
                emptyState={
                  <EmptyState
                    title="No dispatches from this batch"
                    description="Estate owners who receive portions of this batch appear here, and feed the settlement deduction breakdown."
                  />
                }
              />
            ),
          },
        ]}
      />

      <LightConfirmModal
        open={discarding}
        onClose={() => setDiscarding(false)}
        onConfirm={() => discardMutation.mutate(batch.id)}
        loading={discardMutation.isPending}
        tone="danger"
        title="Discard this batch"
        confirmLabel="Mark as Discarded"
        message={
          <>
            <strong>{batch.item}</strong> ({batch.id}) will be marked as discarded and removed from available stock.
            This can only be reversed with a new correcting entry — not undone directly.
          </>
        }
      />
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className={mono ? 'id text-right text-text' : 'text-right text-text'}>{value}</dd>
    </div>
  )
}
