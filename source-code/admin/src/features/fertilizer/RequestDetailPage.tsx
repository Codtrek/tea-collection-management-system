import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, Ban, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as fertilizerService from '@/services/fertilizer'
import { availableForItem, fefoAllocation, remainderOf } from './lib'
import { REQUEST_TONE } from './status'
import { formatCurrency, formatDate, formatWeight } from '@/lib/format'

/* FERT-06 — Request detail & approval (addendum §6). Approval commits stock; it moves
   no money today and is reversible before dispatch, so LightConfirmModal, not HighStakes. */
export function RequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canApprove = can('fertilizer', 'approve')

  const {
    data: request,
    isPending: requestPending,
    isError: requestError,
    refetch: refetchRequest,
  } = useQuery({
    queryKey: ['fertilizer', 'requests', id],
    queryFn: () => fertilizerService.getRequest(id!),
    enabled: !!id,
  })
  const { data: positions, isPending: positionsPending } = useQuery({
    queryKey: ['fertilizer', 'positions'],
    queryFn: fertilizerService.listPositions,
  })
  const { data: batches, isPending: batchesPending } = useQuery({
    queryKey: ['fertilizer', 'batches'],
    queryFn: fertilizerService.listBatches,
  })

  const [approveQty, setApproveQty] = useState<number | null>(null)
  const [keepRemainder, setKeepRemainder] = useState(true)
  const [override, setOverride] = useState(false)
  const [reason, setReason] = useState('')
  const [decision, setDecision] = useState<'approve' | 'reject' | 'cancel' | null>(null)

  const decideMutation = useMutation({
    mutationFn: (input: fertilizerService.DecideRequestInput) => fertilizerService.decideRequest(id!, input),
    onSuccess: (updated) => {
      const msg =
        updated.status === 'Approved'
          ? `Approved ${formatWeight(updated.approvedQtyKg ?? updated.quantityKg)} of ${updated.item} for ${updated.estateName}${override ? ' (over-commitment)' : ''}`
          : updated.status === 'Rejected'
            ? `Rejected the request for ${updated.estateName}`
            : `Cancelled the request for ${updated.estateName}`
      toast(msg, updated.status === 'Approved' ? undefined : 'warning')
      setDecision(null)
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
      navigate('/fertilizer/requests')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not record this decision', 'danger'),
  })

  if (requestPending || positionsPending || batchesPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (requestError || !request || !positions || !batches) {
    return (
      <ErrorState title="Request not found" description={`No fertilizer request with ID “${id}”.`} onRetry={() => void refetchRequest()} />
    )
  }

  const available = availableForItem(request.item, positions)
  const isPending = request.status === 'Submitted'
  const qty = approveQty ?? request.quantityKg

  const isPartial = qty < request.quantityKg
  const exceedsAvailable = qty > available
  const allocation = fefoAllocation(request.item, Math.max(0, qty), batches)
  const reasonRequired = decision === 'reject' || (decision === 'approve' && (isPartial || override))
  const confirmDisabled = reasonRequired && !reason.trim()

  const confirmDecision = () => {
    if (confirmDisabled) return
    if (decision === 'approve') {
      decideMutation.mutate({ decision: 'approve', approvedQtyKg: qty })
    } else if (decision === 'reject') {
      decideMutation.mutate({ decision: 'reject' })
    } else if (decision === 'cancel') {
      decideMutation.mutate({ decision: 'cancel' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Fertilizer Request"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: 'Requests', to: '/fertilizer/requests' },
          { label: request.id },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Request Summary</CardTitle>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs capitalize text-text-muted">
                  {request.origin}
                </span>
                <StatusBadge tone={REQUEST_TONE[request.status]}>{request.status}</StatusBadge>
              </div>
            </CardHeader>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Field label="Estate" value={request.estateName} />
              <Field label="Reference" value={<span className="id">{request.id}</span>} />
              <Field label="Item" value={request.item} />
              <Field
                label="Quantity requested"
                value={<span className="tabular text-lg font-semibold text-text-heading">{formatWeight(request.quantityKg)}</span>}
              />
              <Field label="Requested date" value={formatDate(request.requestedDate)} />
              {request.approvedQtyKg !== undefined && (
                <Field label="Approved" value={formatWeight(request.approvedQtyKg)} />
              )}
              {request.reason && <div className="sm:col-span-2"><Field label="Reason / notes" value={request.reason} /></div>}
            </dl>
          </Card>

          {/* Availability snapshot — live, from the shared selector */}
          <Card>
            <CardHeader><CardTitle>Availability — {request.item}</CardTitle></CardHeader>
            <div className="grid grid-cols-3 gap-4">
              <Snapshot label="Available" value={formatWeight(available)} danger={available < 0} />
              <Snapshot label="Requested" value={formatWeight(isPending ? request.quantityKg : remainderOf(request))} />
              <Snapshot
                label="After approval"
                value={formatWeight(available - qty)}
                danger={available - qty < 0}
              />
            </div>
          </Card>

          {/* Fulfilment decision */}
          {isPending && canApprove && (
            <Card>
              <CardHeader><CardTitle>Fulfilment decision</CardTitle></CardHeader>
              <div className="flex flex-col gap-5">
                <Input
                  label="Quantity to approve (kg)"
                  type="number"
                  min="0"
                  value={String(qty)}
                  onChange={(e) => setApproveQty(Number(e.target.value))}
                  hint={isPartial ? `Partial — ${formatWeight(request.quantityKg - qty)} short of the request` : undefined}
                />

                {/* FEFO allocation suggestion */}
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                    Suggested batches (first-expiring first)
                  </p>
                  {allocation.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {allocation.map((a) => (
                        <li key={a.batchId} className="id rounded-[var(--radius-sm)] bg-surface-sunken px-2 py-1 text-xs text-text">
                          {a.batchId} · {formatWeight(a.take)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-muted">No live stock to allocate.</p>
                  )}
                </div>

                {isPartial && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Remainder</legend>
                    {[
                      { v: true, label: 'Keep remainder open (default)' },
                      { v: false, label: 'Close request at approved quantity' },
                    ].map((o) => (
                      <label key={String(o.v)} className="flex items-center gap-2 text-sm text-text">
                        <input type="radio" name="remainder" checked={keepRemainder === o.v} onChange={() => setKeepRemainder(o.v)} />
                        {o.label}
                      </label>
                    ))}
                  </fieldset>
                )}

                {exceedsAvailable && (
                  <div className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-warning-fg/30 bg-warning-bg/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-text">Over-commitment</p>
                      <p className="text-xs text-text-muted">
                        Approving {formatWeight(qty)} against {formatWeight(available)} available. Allowed only with a
                        reason (e.g. an inbound delivery).
                      </p>
                    </div>
                    <Toggle checked={override} onChange={setOverride} />
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    onClick={() => setDecision('approve')}
                    disabled={qty <= 0 || (exceedsAvailable && !override)}
                  >
                    <Check className="size-4" /> {isPartial ? 'Approve Partially' : 'Approve'}
                  </Button>
                  <Button variant="danger" onClick={() => setDecision('reject')}>
                    <X className="size-4" /> Reject
                  </Button>
                  <Button variant="ghost" onClick={() => setDecision('cancel')}>
                    <Ban className="size-4" /> Cancel Request
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Estate context — informs the decision, display-only for v1 (§6.1) */}
          <Card>
            <CardHeader><CardTitle>Estate context</CardTitle></CardHeader>
            <dl className="flex flex-col gap-4">
              <Field label="Outstanding fertilizer (dispatched, not deducted)" value={formatCurrency(38500)} />
              <Field label="Last settlement net payable" value={`${formatCurrency(412000)} (June 2026)`} />
              <Field label="Self-delivery" value="No — collected on route" />
            </dl>
            <p className="mt-3 text-xs text-text-muted">
              Fertilizer is issued on credit and recovered at settlement. Shown to inform the decision — not an
              automated limit.
            </p>
          </Card>

          {/* Decision history */}
          <Card>
            <CardHeader><CardTitle>Decision history</CardTitle></CardHeader>
            {request.decidedBy ? (
              <div className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                <span className="text-text">
                  {request.status} by <span className="font-medium">{request.decidedBy}</span>
                  <span className="mt-0.5 block text-xs text-text-muted">{request.decidedOn && formatDate(request.decidedOn)}</span>
                </span>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Awaiting a decision.</p>
            )}
          </Card>
        </div>
      </div>

      <LightConfirmModal
        open={!!decision}
        onClose={() => setDecision(null)}
        onConfirm={confirmDecision}
        tone={decision === 'approve' ? 'default' : 'danger'}
        title={decision === 'approve' ? (isPartial ? 'Approve partially' : 'Approve request') : decision === 'reject' ? 'Reject request' : 'Cancel request'}
        confirmLabel={decision === 'approve' ? 'Approve' : decision === 'reject' ? 'Reject' : 'Cancel request'}
        loading={decideMutation.isPending}
        message={
          decision === 'approve' ? (
            <>Approve <strong>{formatWeight(qty)}</strong> of {request.item} for {request.estateName}? This commits stock and creates a future settlement deduction — reversible until dispatch.</>
          ) : decision === 'reject' ? (
            <>Reject the fertilizer request for {request.estateName}?</>
          ) : (
            <>Cancel the fertilizer request for {request.estateName}? This releases any committed stock.</>
          )
        }
      >
        {reasonRequired && (
          <Input
            label={`Reason${decision === 'reject' ? '' : override ? ' (over-commitment)' : ' (partial)'}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required"
            error={confirmDisabled ? 'A reason is required' : undefined}
          />
        )}
      </LightConfirmModal>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  )
}

function Snapshot({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-sunken p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`tabular mt-1 text-lg font-semibold ${danger ? 'text-danger-fg' : 'text-text-heading'}`}>{value}</p>
    </div>
  )
}
