import { useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarClock,
  Check,
  Loader2,
  PackageCheck,
  RotateCcw,
  Scissors,
  Truck,
  Undo2,
  Wallet,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import * as dispatchService from '@/services/dispatch'
import * as estatesService from '@/services/estates'
import * as fertilizerService from '@/services/fertilizer'
import { availableForItem, fefoPrefix, nextInQueue, queueRows, readQueueFilters, shortDate } from './lib'
import { NOTICE_TONE, PAYMENT_METHOD_LABEL, PAYMENT_TONE, REQUEST_TONE } from './status'
import type { DeliveryAttempt, FertilizerRequest, FertilizerRequestDetail, PaymentMethod, RequestAvailability } from './types'
import { formatCurrency, formatDate, formatDateTime, formatWeight } from '@/lib/format'

type Action =
  | 'approve'
  | 'partial'
  | 'reject'
  | 'mgrApprove'
  | 'mgrReject'
  | 'ready'
  | 'date'
  | 'handover'
  | 'checkin'
  | 'retry'
  | 'release'
  | 'cancel'
  | 'payment'

const NOTICE_LABEL: Record<string, string> = {
  approved: 'Approved',
  partially_approved: 'Partially approved',
  rejected: 'Rejected',
  dispatched: 'Delivery date',
  delivered: 'Delivered',
  failed: 'Delivery failed',
  cancelled: 'Cancelled',
}

/*
  FERT-06 — Request detail (Fertilizer-Delivery-Addendum §10). One page carries the request
  from the Officer's decision (FEFO commitment, capped at Available — no override), through the
  Manager's sign-off above the limit, its route-stop delivery (ready → handover → agent →
  delivered / failed → check-in → redelivery / review), to payment. Every figure comes from the
  server; actions are gated by the data-driven permission keys and the request's status.
*/
export function RequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canDecide = can('fertilizerApproval', 'approve')
  const canManager = can('fertilizerManagerApproval', 'approve')
  const canEdit = can('fertilizer', 'edit')

  // `?from=` carries the FERT-05 queue's filters: "Back to queue" and "Next request" keep them
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') ?? ''
  const queueHref = `/fertilizer/requests${from ? `?${from}` : ''}`

  const request = useQuery({
    queryKey: ['fertilizer', 'requests', id],
    queryFn: () => fertilizerService.getRequest(id!),
    enabled: !!id,
  })
  const positions = useQuery({ queryKey: ['fertilizer', 'positions'], queryFn: fertilizerService.listPositions })
  const allRequests = useQuery({ queryKey: ['fertilizer', 'requests'], queryFn: fertilizerService.listRequests })

  // the facts an Officer reviews before deciding — only fetched while there is a decision to make
  const reviewing = canDecide && request.data?.status === 'Requested'
  const estateId = request.data?.estateId ?? ''
  // "Mark ready" books the route's next collection day strictly after today — so ask about tomorrow
  const tomorrow = new Date(Date.parse(`${factoryToday()}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
  const routeAgent = useQuery({
    queryKey: ['dispatch', 'estate-route-agent', estateId, tomorrow],
    queryFn: () => dispatchService.getEstateRouteAgent(estateId, tomorrow),
    enabled: reviewing,
  })
  const lifetime = useQuery({
    queryKey: ['estate', estateId, 'lifetime'],
    queryFn: () => estatesService.getLifetimeMetrics(estateId),
    enabled: reviewing,
  })
  const prices = useQuery({ queryKey: ['fertilizer', 'prices'], queryFn: fertilizerService.listPrices, enabled: reviewing })

  const [action, setAction] = useState<Action | null>(null)
  // the request a decision was just saved for — offers "Next request" (an id, not a flag, so
  // moving on to the next request resets it without an effect)
  const [decidedId, setDecidedId] = useState<string | null>(null)

  const run = useMutation({
    mutationFn: (job: { call: () => Promise<FertilizerRequestDetail>; done: string; decision?: boolean }) => job.call(),
    onSuccess: (updated, job) => {
      queryClient.setQueryData(['fertilizer', 'requests', id], updated)
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
      toast(job.done)
      setAction(null)
      if (job.decision) setDecidedId(id ?? null)
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'That didn’t work', 'danger'),
  })

  if (request.isPending || positions.isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (request.isError || !request.data || !positions.data) {
    return (
      <ErrorState
        title="Request not found"
        description={`No fertilizer request with ID “${id}”.`}
        onRetry={() => void request.refetch()}
      />
    )
  }

  const r = request.data
  const attempt = r.attempt && !r.attempt.cancelled ? r.attempt : null
  const available = availableForItem(r.item, positions.data)
  const status = r.status
  const preDispatch = status === 'Ready for dispatch' || status === 'Rescheduled'
  const carried = attempt?.handoverQtyKg ?? 0
  const toCheckIn = Math.max(0, carried - (attempt?.deliveredQtyKg ?? 0))
  // a partial approval is strictly less than asked, and never more than is free
  const partialMax = Math.min(available, r.quantityKg - 1)
  const currentPrice = prices.data?.find((p) => p.item === r.item && p.current)?.ratePerKg ?? null
  const nextDate = routeAgent.data ? (routeAgent.data.scheduled ? tomorrow : routeAgent.data.nextScheduledDate) : null
  const previous = (allRequests.data ?? [])
    .filter((x) => x.estateId === r.estateId && x.id !== r.id)
    .sort((a, b) => b.requestedDate.localeCompare(a.requestedDate))
    .slice(0, 5)
  const next =
    decidedId === r.id && allRequests.data
      ? nextInQueue(queueRows(allRequests.data, readQueueFilters(new URLSearchParams(from))), r.id)
      : null

  const do_ = (call: () => Promise<FertilizerRequestDetail>, done: string, decision?: boolean) =>
    run.mutate({ call, done, decision })
  const openRequest = (rid: string) =>
    navigate(`/fertilizer/requests/${rid}${from ? `?from=${encodeURIComponent(from)}` : ''}`)

  return (
    <div>
      <PageHeader
        title="Fertilizer Request"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: 'Requests', to: queueHref },
          { label: r.id },
        ]}
      />

      {decidedId === r.id && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-brand-soft/50 px-4 py-3">
          <p className="text-sm text-text">
            Decision saved — <strong>{r.status}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate(queueHref)}>
              <ArrowLeft className="size-4" /> Back to queue
            </Button>
            {next ? (
              <Button size="sm" onClick={() => openRequest(next.id)}>
                Next request · {next.id} <ArrowRight className="size-4" />
              </Button>
            ) : (
              <span className="self-center text-xs text-text-muted">No more requests in this queue.</span>
            )}
          </div>
        </div>
      )}

      {/* its own row, not the header's action slot — several buttons must wrap on narrow screens */}
      <ActionBar r={r} canEdit={canEdit} preDispatch={preDispatch} onAction={setAction} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SummaryCard r={r} />

          {status === 'Requested' && canDecide && (
            // review on the page, confirm in a modal (Fertilizer-Delivery-Addendum §10)
            <Card>
              <CardHeader>
                <CardTitle>Officer decision</CardTitle>
              </CardHeader>
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-3 gap-4">
                  <Snapshot label="Available now" value={formatWeight(available)} danger={available < r.quantityKg} />
                  <Snapshot label="Requested" value={formatWeight(r.quantityKg)} />
                  <Snapshot
                    label="After full approval"
                    value={formatWeight(available - r.quantityKg)}
                    danger={available - r.quantityKg < 0}
                  />
                </div>
                <FefoPreview allocation={r.availability?.fefo ?? []} />
                <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <Field
                    label="Route · next collection day"
                    value={
                      routeAgent.isPending
                        ? '…'
                        : `${r.routeName ?? routeAgent.data?.routeName ?? '—'}${nextDate ? ` · ${formatDate(nextDate)}` : ''}`
                    }
                  />
                  <Field label="Payment method" value={PAYMENT_METHOD_LABEL[r.payment.method]} />
                  <Field
                    label="Price today (fixed at approval)"
                    value={currentPrice !== null ? `${formatCurrency(currentPrice)}/kg` : prices.isPending ? '…' : 'No price set'}
                  />
                  <Field
                    label="Owner’s fertilizer balance"
                    value={
                      lifetime.data ? (
                        <span className={lifetime.data.outstanding.fertilizerUndeductedRs > 0 ? 'font-medium text-warning-fg' : undefined}>
                          {formatCurrency(lifetime.data.outstanding.fertilizerUndeductedRs)} outstanding
                        </span>
                      ) : lifetime.isError ? (
                        '—'
                      ) : (
                        '…'
                      )
                    }
                  />
                </dl>
                <PreviousRequests rows={previous} estateName={r.estateName} onOpen={openRequest} />
                {available < r.quantityKg && (
                  <p className="text-xs text-warning-fg">
                    Only {formatWeight(Math.max(0, available))} is free — approve partially or reject. Stock is never promised twice.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button onClick={() => setAction('approve')} disabled={available < r.quantityKg}>
                    <Check className="size-4" /> Approve
                  </Button>
                  <Button variant="secondary" onClick={() => setAction('partial')} disabled={partialMax <= 0}>
                    <Scissors className="size-4" /> Partial approve
                  </Button>
                  <Button variant="danger" onClick={() => setAction('reject')}>
                    <X className="size-4" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {status === 'Awaiting manager approval' && (
            <Card>
              <CardHeader>
                <CardTitle>Factory Manager approval</CardTitle>
                <StatusBadge tone="warning">Over the limit</StatusBadge>
              </CardHeader>
              <p className="text-sm text-text">
                {r.decidedBy} approved <strong>{formatWeight(r.approvedQtyKg ?? r.quantityKg)}</strong> — above the{' '}
                {formatWeight(r.managerApprovalAboveKg)} limit, so a Factory Manager must also approve. The stock is already
                committed to this owner.
              </p>
              {canManager ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button onClick={() => setAction('mgrApprove')}>
                    <Check className="size-4" /> Approve
                  </Button>
                  <Button variant="danger" onClick={() => setAction('mgrReject')}>
                    <X className="size-4" /> Reject and release the stock
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-text-muted">Waiting for a Factory Manager.</p>
              )}
            </Card>
          )}

          <DeliveryCard r={r} attempt={attempt} />
          <TimelineCard r={r} />
        </div>

        <div className="flex flex-col gap-6">
          <PaymentCard r={r} canEdit={canEdit} onRecord={() => setAction('payment')} onMethod={(m) =>
            do_(() => fertilizerService.setPaymentMethod(r.id, m), `Payment method: ${PAYMENT_METHOD_LABEL[m]}`)
          } busy={run.isPending} />
          <AllocationCard r={r} />
          <NoticesCard r={r} />
        </div>
      </div>

      {action && (
        <ActionDialog
          key={action}
          action={action}
          r={r}
          partialMax={partialMax}
          plan={r.availability?.fefo ?? []}
          price={currentPrice}
          nextDate={nextDate}
          committed={r.committedKg}
          toCheckIn={toCheckIn}
          loading={run.isPending}
          onClose={() => setAction(null)}
          onRun={do_}
        />
      )}
    </div>
  )
}

/* ── Header actions: only what the status and the user's permission allow ── */

function ActionBar({
  r,
  canEdit,
  preDispatch,
  onAction,
}: {
  r: FertilizerRequestDetail
  canEdit: boolean
  preDispatch: boolean
  onAction: (a: Action) => void
}) {
  if (!canEdit) return null
  const s = r.status
  const buttons: ReactNode[] = []
  if (s === 'Approved' || s === 'Partially approved')
    buttons.push(
      <Button key="ready" onClick={() => onAction('ready')}>
        <Truck className="size-4" /> Mark ready for dispatch
      </Button>,
    )
  if (preDispatch) {
    buttons.push(
      <Button key="handover" onClick={() => onAction('handover')}>
        <PackageCheck className="size-4" /> Record handover
      </Button>,
      <Button key="date" variant="secondary" onClick={() => onAction('date')}>
        <CalendarClock className="size-4" /> Change date
      </Button>,
    )
  }
  if (s === 'Failed' || s === 'Partially delivered')
    buttons.push(
      <Button key="checkin" onClick={() => onAction('checkin')}>
        <Undo2 className="size-4" /> Check in returned stock
      </Button>,
    )
  if (s === 'Needs review')
    buttons.push(
      <Button key="retry" onClick={() => onAction('retry')}>
        <RotateCcw className="size-4" /> Retry delivery
      </Button>,
    )
  if ((s === 'Rescheduled' || s === 'Needs review') && r.deliveredQtyKg > 0)
    buttons.push(
      <Button key="release" variant="secondary" onClick={() => onAction('release')}>
        Release undelivered remainder
      </Button>,
    )
  if (
    ['Requested', 'Awaiting manager approval', 'Approved', 'Partially approved', 'Ready for dispatch', 'Rescheduled', 'Needs review'].includes(s)
  )
    buttons.push(
      <Button key="cancel" variant="ghost" onClick={() => onAction('cancel')}>
        <Ban className="size-4" /> Cancel request
      </Button>,
    )
  return buttons.length ? <div className="mb-6 flex flex-wrap items-center gap-2">{buttons}</div> : null
}

/* ── One dialog for every action; the server enforces the rules, this only collects input ── */

function ActionDialog({
  action,
  r,
  partialMax,
  plan,
  price,
  nextDate,
  committed,
  toCheckIn,
  loading,
  onClose,
  onRun,
}: {
  action: Action
  r: FertilizerRequestDetail
  partialMax: number
  /** the server's FEFO plan over free stock for min(requested, available) */
  plan: RequestAvailability['fefo']
  /** today's Rs./kg for the item — what approval will snapshot */
  price: number | null
  /** the route's next collection day (the delivery date is set when it's marked ready) */
  nextDate: string | null
  committed: number
  toCheckIn: number
  loading: boolean
  onClose: () => void
  onRun: (call: () => Promise<FertilizerRequestDetail>, done: string, decision?: boolean) => void
}) {
  const today = factoryToday()
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState(String(r.payment.outstandingRs || ''))
  const [method, setMethod] = useState<'cash' | 'bank'>(r.payment.method === 'bank' ? 'bank' : 'cash')
  const [reference, setReference] = useState('')
  const [handover, setHandover] = useState(String(committed))
  const [checkIn, setCheckIn] = useState(String(toCheckIn))
  const [partialQty, setPartialQty] = useState(String(Math.max(0, partialMax)))

  // the quantity this decision commits: all of it, or the partial amount typed in the modal
  const qty = action === 'partial' ? Number(partialQty) : r.quantityKg
  const partialInvalid = action === 'partial' && !(qty > 0 && qty <= partialMax)
  const overLimit = qty > r.managerApprovalAboveKg
  const needReason = ['partial', 'reject', 'mgrReject', 'release', 'cancel', 'date'].includes(action)
  const missing = needReason && !reason.trim()

  const approveSummary = (
    <>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-[var(--radius-md)] bg-surface-sunken p-3 text-xs">
        <dt className="text-text-muted">Quantity</dt>
        <dd className="tabular text-right font-medium text-text">
          {partialInvalid ? '—' : formatWeight(qty)}
          {action === 'partial' && !partialInvalid && <span className="text-text-muted"> of {formatWeight(r.quantityKg)}</span>}
        </dd>
        <dt className="text-text-muted">Price (snapshot)</dt>
        <dd className="tabular text-right text-text">
          {price !== null ? `${formatCurrency(price)}/kg · ${formatCurrency(price * (partialInvalid ? 0 : qty))}` : 'No price set'}
        </dd>
        <dt className="text-text-muted">Earliest delivery</dt>
        <dd className="text-right text-text">{nextDate ? formatDate(nextDate) : 'Next collection day'}</dd>
      </dl>
      <div className="mt-3">
        <FefoPreview allocation={fefoPrefix(plan, partialInvalid ? 0 : qty)} />
      </div>
      {overLimit && !partialInvalid && (
        <span className="mt-2 block text-warning-fg">
          That is over the {formatWeight(r.managerApprovalAboveKg)} limit — a Factory Manager must also approve.
        </span>
      )}
    </>
  )

  const cfg: Record<Action, { title: string; label: string; tone?: 'danger'; message: ReactNode; go: () => void; disabled?: boolean }> = {
    approve: {
      title: 'Approve request',
      label: 'Confirm approval',
      message: (
        <>
          Commit <strong>{formatWeight(qty)}</strong> of {r.item} to {r.estateName}, first-expiring batches first.
          {approveSummary}
        </>
      ),
      go: () =>
        onRun(
          () => fertilizerService.decideRequest(r.id, { decision: 'approve', approvedQtyKg: qty }),
          overLimit ? 'Approved — waiting for a Factory Manager' : `Approved ${formatWeight(qty)}`,
          true,
        ),
    },
    partial: {
      title: 'Partial approve',
      label: 'Confirm partial approval',
      message: (
        <>
          Approve less than the {formatWeight(r.quantityKg)} asked — at most {formatWeight(Math.max(0, partialMax))} (what is
          free, and less than requested). The reason is shown to the owner.
          {approveSummary}
        </>
      ),
      go: () =>
        onRun(
          () => fertilizerService.decideRequest(r.id, { decision: 'approve', approvedQtyKg: qty, reason: reason.trim() }),
          overLimit ? 'Approved — waiting for a Factory Manager' : `Approved ${formatWeight(qty)} of ${formatWeight(r.quantityKg)}`,
          true,
        ),
      disabled: partialInvalid,
    },
    reject: {
      title: 'Reject request',
      label: 'Reject',
      tone: 'danger',
      message: <>Reject the request for {r.estateName}? The reason is shown to the owner.</>,
      go: () => onRun(() => fertilizerService.decideRequest(r.id, { decision: 'reject', reason: reason.trim() }), 'Request rejected', true),
    },
    mgrApprove: {
      title: 'Manager approval',
      label: 'Approve',
      message: <>Approve {formatWeight(r.approvedQtyKg ?? r.quantityKg)} of {r.item} for {r.estateName}?</>,
      go: () =>
        onRun(
          () => fertilizerService.managerDecide(r.id, { decision: 'approve', reason: reason.trim() || undefined }),
          'Approved by the Factory Manager',
          true,
        ),
    },
    mgrReject: {
      title: 'Reject as Factory Manager',
      label: 'Reject',
      tone: 'danger',
      message: <>The committed stock goes back to Available. The reason is shown to the owner.</>,
      go: () =>
        onRun(() => fertilizerService.managerDecide(r.id, { decision: 'reject', reason: reason.trim() }), 'Rejected — stock released', true),
    },
    ready: {
      title: 'Mark ready for dispatch',
      label: 'Mark ready',
      message: (
        <>
          The fertilizer goes on {r.estateName}’s stop on {r.routeName ?? 'its route'}’s next collection day, for whichever
          agent runs the route that day. The owner is told the date.
        </>
      ),
      go: () => onRun(() => fertilizerService.markReady(r.id), 'Ready for dispatch'),
    },
    date: {
      title: 'Change delivery date',
      label: 'Change date',
      message: <>Pick a day {r.attempt?.routeName ?? 'the route'} runs (today is allowed). The owner is told the new date.</>,
      go: () => onRun(() => fertilizerService.changeDeliveryDate(r.id, date, reason.trim()), `Delivery moved to ${formatDate(date)}`),
      disabled: !date,
    },
    handover: {
      title: 'Record handover to the agent',
      label: 'Record handover',
      message: (
        <>
          Hand {formatWeight(committed)} to {r.attempt?.agentName ?? 'the agent running the route today'}. This takes it out of
          the store (On Hand and Committed both go down) and the task stays with that agent.
        </>
      ),
      go: () => onRun(() => fertilizerService.recordHandover(r.id, Number(handover)), 'Handover recorded'),
      disabled: !(Number(handover) > 0),
    },
    checkin: {
      title: 'Check in returned stock',
      label: 'Check in',
      message: (
        <>
          The agent should bring back {formatWeight(toCheckIn)}. It goes back into the store and stays committed to this
          owner; the next delivery is scheduled automatically.
        </>
      ),
      go: () => onRun(() => fertilizerService.checkIn(r.id, Number(checkIn)), 'Checked in'),
      disabled: !(Number(checkIn) > 0),
    },
    retry: {
      title: 'Retry delivery',
      label: 'Retry',
      message: <>Start a new round of attempts on the route’s next collection day, or a scheduled day you pick.</>,
      go: () => onRun(() => fertilizerService.retryDelivery(r.id, date === today ? undefined : date), 'Delivery rescheduled'),
    },
    release: {
      title: 'Release the undelivered remainder',
      label: 'Release',
      message: (
        <>
          The owner refused the rest. {formatWeight(r.committedKg)} goes back to general stock and the request closes as
          Delivered for {formatWeight(r.deliveredQtyKg)}.
        </>
      ),
      go: () => onRun(() => fertilizerService.releaseShortfall(r.id, reason.trim()), 'Remainder released'),
    },
    cancel: {
      title: 'Cancel request',
      label: 'Cancel request',
      tone: 'danger',
      message: <>Committed stock goes back to Available and the owner is told.</>,
      go: () => onRun(() => fertilizerService.cancelRequest(r.id, reason.trim()), 'Request cancelled'),
    },
    payment: {
      title: 'Record a payment',
      label: 'Record payment',
      message: <>Outstanding: {formatCurrency(r.payment.outstandingRs)}.</>,
      go: () =>
        onRun(
          () =>
            fertilizerService.recordPayment(r.id, {
              amount: Number(amount),
              paidOn: date,
              method,
              reference: reference.trim() || undefined,
            }),
          'Payment recorded',
        ),
      disabled: !(Number(amount) > 0) || (method === 'bank' && !reference.trim()),
    },
  }
  const c = cfg[action]

  return (
    <LightConfirmModal
      open
      onClose={onClose}
      onConfirm={c.go}
      title={c.title}
      confirmLabel={c.label}
      tone={c.tone}
      loading={loading}
      confirmDisabled={missing || c.disabled}
      message={c.message}
    >
      <div className="flex flex-col gap-3">
        {action === 'partial' && (
          <Input
            label="Quantity to approve (kg)"
            type="number"
            min="1"
            max={String(Math.max(0, partialMax))}
            value={partialQty}
            onChange={(e) => setPartialQty(e.target.value)}
            error={
              partialQty !== '' && partialInvalid
                ? `Enter more than 0 and at most ${formatWeight(Math.max(0, partialMax))}.`
                : undefined
            }
          />
        )}
        {action === 'handover' && (
          <Input label="Quantity handed over (kg)" type="number" value={handover} onChange={(e) => setHandover(e.target.value)} />
        )}
        {action === 'checkin' && (
          <Input label="Quantity returned (kg)" type="number" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        )}
        {(action === 'date' || action === 'retry') && (
          <Input
            label={action === 'retry' ? 'Delivery date (today = next collection day)' : 'New delivery date'}
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
        {action === 'payment' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Method"
              value={method}
              onChange={(e) => setMethod(e.target.value as 'cash' | 'bank')}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank', label: 'Bank transfer' },
              ]}
            />
            <Input label="Amount (Rs.)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input label="Paid on" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
            <Input
              label={method === 'bank' ? 'Bank reference' : 'Receipt no. (optional)'}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        )}
        {(needReason || action === 'mgrApprove') && (
          <Input
            label={needReason ? 'Reason' : 'Note (optional)'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={needReason ? 'Required' : ''}
            error={missing && reason !== '' ? 'A reason is required' : undefined}
          />
        )}
      </div>
    </LightConfirmModal>
  )
}

/* ── Panels ── */

function SummaryCard({ r }: { r: FertilizerRequestDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs capitalize text-text-muted">{r.origin}</span>
          {r.attemptLabel && <span className="text-xs font-medium text-text-muted">{r.attemptLabel}</span>}
          <StatusBadge tone={REQUEST_TONE[r.status]}>{r.status}</StatusBadge>
        </div>
      </CardHeader>
      <dl className="grid gap-5 sm:grid-cols-3">
        <Field label="Estate" value={r.estateName} />
        <Field label="Reference" value={<span className="id">{r.id}{r.orderRef ? ` · order ${r.orderRef}` : ''}</span>} />
        <Field label="Route" value={r.routeName ?? '—'} />
        <Field label="Item" value={r.item} />
        <Field label="Requested" value={<span className="tabular font-semibold text-text-heading">{formatWeight(r.quantityKg)}</span>} />
        <Field label="Approved" value={r.approvedQtyKg !== undefined ? formatWeight(r.approvedQtyKg) : '—'} />
        <Field label="Delivered" value={formatWeight(r.deliveredQtyKg)} />
        <Field label="Committed now" value={formatWeight(r.committedKg)} />
        <Field label="Price (fixed at approval)" value={r.ratePerKg !== null ? `${formatCurrency(r.ratePerKg)}/kg` : '—'} />
        {r.reason && (
          <div className="sm:col-span-3">
            <Field label="Request note" value={r.reason} />
          </div>
        )}
        {r.decisionReason && (
          <div className="sm:col-span-3">
            <Field label="Decision reason (shown to the owner)" value={r.decisionReason} />
          </div>
        )}
      </dl>
      {r.pickupMismatch && (
        <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-warning-fg/30 bg-warning-bg/50 p-3 text-sm text-warning-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          The agent confirmed a different pickup quantity than the factory handed over — see the delivery below.
        </p>
      )}
    </Card>
  )
}

function DeliveryCard({ r, attempt }: { r: FertilizerRequestDetail; attempt: DeliveryAttempt | null }) {
  const past = r.attempts.filter((a) => a.id !== attempt?.id)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery</CardTitle>
        {r.attemptLabel && <span className="text-xs font-medium text-text-muted">{r.attemptLabel}</span>}
      </CardHeader>
      {!attempt && r.attempts.length === 0 ? (
        <p className="text-sm text-text-muted">
          Not dispatched yet. Once approved, “Mark ready for dispatch” puts it on {r.estateName}’s stop on the route’s next
          collection day.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {attempt && <AttemptBlock a={attempt} current />}
          {past.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-text-muted">Earlier attempts ({past.length})</summary>
              <div className="mt-3 flex flex-col gap-3">
                {[...past].reverse().map((a) => (
                  <AttemptBlock key={a.id} a={a} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  )
}

function AttemptBlock({ a, current }: { a: DeliveryAttempt; current?: boolean }) {
  return (
    <div className={`rounded-[var(--radius-md)] border p-3 ${current ? 'border-border' : 'border-border/60 opacity-90'}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-text">Attempt {a.attemptNo}</span>
        <span className="text-text-muted">
          {formatDate(a.scheduledDate)} · {a.routeName}
        </span>
        {a.cancelled && <StatusBadge tone="neutral">Cancelled</StatusBadge>}
        {a.outcome === 'delivered' && <StatusBadge tone="success">Delivered</StatusBadge>}
        {a.outcome === 'partial' && <StatusBadge tone="warning">Partly delivered</StatusBadge>}
        {a.outcome === 'failed' && <StatusBadge tone="danger">Failed</StatusBadge>}
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field
          label={a.pinned ? 'Agent (has the fertilizer)' : 'Agent that day'}
          value={a.agentName ? `${a.agentName}${a.covering ? ' (covering)' : ''}` : 'Nobody runs the route that day yet'}
        />
        {a.handoverQtyKg !== null && (
          <Field label="Handed over" value={`${formatWeight(a.handoverQtyKg)} by ${a.handoverBy} · ${a.handoverAt ? formatDateTime(a.handoverAt) : ''}`} />
        )}
        {a.agentConfirmQtyKg !== null && (
          <Field
            label="Agent confirmed pickup"
            value={
              <span className={a.pickupMismatch ? 'text-warning-fg' : undefined}>
                {formatWeight(a.agentConfirmQtyKg)}
                {a.pickupMismatch && ' — differs from the handover'}
              </span>
            }
          />
        )}
        {a.outForDeliveryAt && <Field label="Out for delivery" value={formatDateTime(a.outForDeliveryAt)} />}
        {a.deliveredQtyKg !== null && (
          <Field
            label="Delivered (owner confirmed)"
            value={`${formatWeight(a.deliveredQtyKg)} · ${a.ownerName ?? ''}${a.ownerConfirmedAt ? ` · ${formatDateTime(a.ownerConfirmedAt)}` : ''}`}
          />
        )}
        {a.shortfallReason && <Field label="Not delivered because" value={a.shortfallReason} />}
        {a.failReasonLabel && (
          <Field label="Failed because" value={`${a.failReasonLabel}${a.failNote ? ` — ${a.failNote}` : ''}`} />
        )}
        {a.photos.length > 0 && (
          <Field
            label="Photos"
            value={a.photos.map((p) => `${p.label} · ${formatDateTime(p.takenAt)}`).join('; ')}
          />
        )}
        {a.checkedInQtyKg !== null && (
          <Field label="Checked back in" value={`${formatWeight(a.checkedInQtyKg)} by ${a.checkedInBy}`} />
        )}
      </dl>
    </div>
  )
}

function TimelineCard({ r }: { r: FertilizerRequestDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      {r.timeline.length === 0 ? (
        <p className="text-sm text-text-muted">No events yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {[...r.timeline].reverse().map((e, i) => (
            <li key={`${e.at}-${i}`} className="flex gap-3 text-sm">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-hidden />
              <span className="min-w-0">
                <span className="text-text">
                  <span className="font-medium">{e.action}</span>
                  {e.toStatus && e.toStatus !== e.fromStatus && (
                    <>
                      {' '}
                      <StatusBadge tone={REQUEST_TONE[e.toStatus as keyof typeof REQUEST_TONE] ?? 'neutral'}>{e.toStatus}</StatusBadge>
                    </>
                  )}
                </span>
                <span className="block text-xs text-text-muted">
                  {e.actor} ({e.actorRole}) · {formatDateTime(e.deviceAt ?? e.at)}
                  {e.deviceAt && ' (on the agent’s phone)'}
                </span>
                {e.note && <span className="block text-xs text-text">{e.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function PaymentCard({
  r,
  canEdit,
  onRecord,
  onMethod,
  busy,
}: {
  r: FertilizerRequestDetail
  canEdit: boolean
  onRecord: () => void
  onMethod: (m: PaymentMethod) => void
  busy: boolean
}) {
  const locked = ['Delivered', 'Rejected', 'Cancelled'].includes(r.status)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <StatusBadge tone={PAYMENT_TONE[r.payment.status]}>{r.payment.status}</StatusBadge>
      </CardHeader>
      <div className="flex flex-col gap-4">
        {canEdit && !locked ? (
          <Select
            label="Payment method"
            value={r.payment.method}
            disabled={busy}
            onChange={(e) => onMethod(e.target.value as PaymentMethod)}
            options={(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))}
          />
        ) : (
          <Field label="Payment method" value={PAYMENT_METHOD_LABEL[r.payment.method]} />
        )}
        <dl className="grid grid-cols-2 gap-3">
          <Field label="Amount owed" value={<span className="tabular">{formatCurrency(r.payment.amountOwedRs)}</span>} />
          <Field label="Outstanding" value={<span className="tabular font-semibold">{formatCurrency(r.payment.outstandingRs)}</span>} />
          <Field label="Deducted at settlement" value={<span className="tabular">{formatCurrency(r.payment.recoveredRs)}</span>} />
          <Field label="Paid (cash / bank)" value={<span className="tabular">{formatCurrency(r.payment.paidRs)}</span>} />
        </dl>
        {r.charges.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs text-text-muted">
            {r.charges.map((c) => (
              <li key={c.id} className="tabular">
                {c.id}: {formatWeight(c.qtyKg)} × {formatCurrency(c.ratePerKg)} = {formatCurrency(c.totalRs)} ·{' '}
                {PAYMENT_METHOD_LABEL[c.method]}
                {c.settlementId ? ` · deducted (${c.settlementId})` : c.method === 'deduct' ? ' · pending deduction' : ''}
              </li>
            ))}
          </ul>
        )}
        {r.payments.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs text-text">
            {r.payments.map((p) => (
              <li key={p.id} className="tabular">
                {formatCurrency(p.amountRs)} · {p.method === 'bank' ? `Bank (${p.reference})` : 'Cash'} · {formatDate(p.paidOn)} ·{' '}
                {p.recordedBy}
              </li>
            ))}
          </ul>
        )}
        {r.payment.method === 'deduct' && r.payment.outstandingRs > 0 && (
          <p className="text-xs text-text-muted">Recovered from the owner’s next tea settlement.</p>
        )}
        {canEdit && r.payment.outstandingRs > 0 && (
          <Button variant="secondary" size="sm" onClick={onRecord}>
            <Wallet className="size-4" /> Record cash / bank payment
          </Button>
        )}
      </div>
    </Card>
  )
}

function AllocationCard({ r }: { r: FertilizerRequestDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock for this request</CardTitle>
      </CardHeader>
      {r.allocations.length === 0 ? (
        <p className="text-sm text-text-muted">Nothing committed.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {r.allocations.map((a, i) => (
            <li key={`${a.batchId}-${a.state}-${i}`} className="flex items-center justify-between gap-2">
              <span>
                <span className="id">{a.lotNumber || a.batchId}</span>
                <span className="block text-xs text-text-muted">expires {formatDate(a.expiryDate)}</span>
              </span>
              <span className="text-right">
                <span className="tabular">{formatWeight(a.qtyKg)}</span>
                <span className="block text-xs text-text-muted">{a.state === 'active' ? 'committed' : 'handed out'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function NoticesCard({ r }: { r: FertilizerRequestDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner notices</CardTitle>
      </CardHeader>
      {r.notices.length === 0 ? (
        <p className="text-sm text-text-muted">None yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {[...r.notices].reverse().map((n, i) => (
            <li key={`${n.createdAt}-${i}`} className="flex items-center justify-between gap-2">
              <span>
                {NOTICE_LABEL[n.kind] ?? n.kind}
                <span className="block text-xs text-text-muted">{formatDateTime(n.createdAt)}</span>
              </span>
              <StatusBadge tone={NOTICE_TONE[n.status]}>{n.status}</StatusBadge>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-text-muted">
        Owners have no app yet: notices are stored for their account and shown as “Stored, not delivered” until they have a
        registered device.
      </p>
    </Card>
  )
}

/** The same owner's recent requests — context for the decision (FERT-06 review). */
function PreviousRequests({
  rows,
  estateName,
  onOpen,
}: {
  rows: FertilizerRequest[]
  estateName: string
  onOpen: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">{estateName}’s previous requests</p>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">None — this is the first.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-md)] border border-border">
          {rows.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover"
              >
                <span className="text-text">
                  <span className="id text-xs text-text-muted">{p.id}</span> · {p.item} · {formatWeight(p.quantityKg)} ·{' '}
                  {formatDate(p.requestedDate)}
                </span>
                <StatusBadge tone={REQUEST_TONE[p.status]}>{p.status}</StatusBadge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FefoPreview({ allocation }: { allocation: RequestAvailability['fefo'] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
        Batches it will take (first-expiring free stock first)
      </p>
      {allocation.length ? (
        <ul className="flex flex-wrap gap-2">
          {allocation.map((a) => (
            <li key={a.batchId} className="id rounded-[var(--radius-sm)] bg-surface-sunken px-2 py-1 text-xs text-text">
              {a.batchId} · {formatWeight(a.take)} · expires {shortDate(a.expiryDate)} ({a.daysToExpiry} d)
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">No free live stock to commit.</p>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
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
