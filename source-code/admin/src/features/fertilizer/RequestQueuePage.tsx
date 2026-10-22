import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PhoneCall, Check, X, Eye, CheckCheck, Loader2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as fertilizerService from '@/services/fertilizer'
import { availableForItem, requestAvailability } from './lib'
import { PAYMENT_METHOD_LABEL, PAYMENT_TONE, REQUEST_TONE } from './status'
import type { FertilizerBatch, FertilizerRequest, ItemPosition, RequestStatus } from './types'
import { formatCurrency, formatDate, formatWeight } from '@/lib/format'

/*
  FERT-05 — the fertilizer work queue (Fertilizer-Delivery-Addendum §10): requests to decide,
  approved stock waiting for its route stop, deliveries in play, the ones that need a decision
  after repeated failures, and the closed ones. Shows each request's attempt, delivery date and
  agent, payment method and payment status.
*/

const TABS = [
  { id: 'decide', label: 'To decide' },
  { id: 'approved', label: 'Approved' },
  { id: 'delivery', label: 'In delivery' },
  { id: 'review', label: 'Needs review' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
]

const ALL_STATUSES: RequestStatus[] = [
  'Requested',
  'Awaiting manager approval',
  'Approved',
  'Partially approved',
  'Ready for dispatch',
  'Picked up',
  'Out for delivery',
  'Partially delivered',
  'Failed',
  'Returned to factory',
  'Rescheduled',
  'Needs review',
  'Delivered',
  'Rejected',
  'Cancelled',
]

const TAB_STATUSES: Record<string, RequestStatus[]> = {
  decide: ['Requested', 'Awaiting manager approval'],
  approved: ['Approved', 'Partially approved'],
  delivery: [
    'Ready for dispatch',
    'Picked up',
    'Out for delivery',
    'Partially delivered',
    'Failed',
    'Returned to factory',
    'Rescheduled',
  ],
  review: ['Needs review'],
  closed: ['Delivered', 'Rejected', 'Cancelled'],
  all: ALL_STATUSES,
}

export function RequestQueuePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  // data-driven: the Officer's approval is its own permission key (the Administrator audits)
  const canApprove = can('fertilizerApproval', 'approve')

  const [tab, setTab] = useState('decide')
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const {
    data: requests,
    isPending: requestsPending,
    isError: requestsError,
    refetch: refetchRequests,
  } = useQuery({ queryKey: ['fertilizer', 'requests'], queryFn: fertilizerService.listRequests })
  const {
    data: positions,
    isPending: positionsPending,
    isError: positionsError,
    refetch: refetchPositions,
  } = useQuery({ queryKey: ['fertilizer', 'positions'], queryFn: fertilizerService.listPositions })
  const {
    data: batches,
    isPending: batchesPending,
    isError: batchesError,
    refetch: refetchBatches,
  } = useQuery({ queryKey: ['fertilizer', 'batches'], queryFn: fertilizerService.listBatches })

  const bulkApproveMutation = useMutation({
    mutationFn: ({ ids }: { ids: string[]; skipped: number }) =>
      Promise.all(ids.map((id) => fertilizerService.decideRequest(id, { decision: 'approve' }))),
    onSuccess: (approved, { skipped }) => {
      toast(`Approved ${approved.length} request${approved.length > 1 ? 's' : ''}${skipped ? ` · ${skipped} skipped (insufficient stock)` : ''}`)
      setSelected([])
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not approve the selected requests', 'danger'),
  })

  const rows = useMemo(() => {
    const allowed = TAB_STATUSES[tab]
    const q = search.trim().toLowerCase()
    return (requests ?? [])
      .filter(
        (r) =>
          allowed.includes(r.status) &&
          (!status || r.status === status) &&
          (!origin || r.origin === origin) &&
          (r.estateName.toLowerCase().includes(q) ||
            r.item.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q) ||
            (r.orderRef ?? '').toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        // oldest first while deciding (waiting longest = decide first); newest first elsewhere
        tab === 'decide' ? a.requestedDate.localeCompare(b.requestedDate) : b.requestedDate.localeCompare(a.requestedDate),
      )
  }, [requests, tab, search, origin, status])

  if (requestsPending || positionsPending || batchesPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (requestsError || positionsError || batchesError || !requests || !positions || !batches) {
    return (
      <ErrorState
        title="Couldn't load fertilizer requests"
        description="Something went wrong fetching request and stock data."
        onRetry={() => {
          void refetchRequests()
          void refetchPositions()
          void refetchBatches()
        }}
      />
    )
  }

  const bulkApprove = () => {
    // Re-check availability against the current pool before submitting —
    // approving in sequence consumes the same stock, so a later selection may
    // no longer be coverable (§6). Requests that don't fit are simply left
    // unselected rather than sent to the server.
    const pool: Record<string, number> = {}
    const toApprove: string[] = []
    let skipped = 0
    for (const id of selected) {
      const req = requests.find((r) => r.id === id)
      if (!req || req.status !== 'Requested') continue
      if (pool[req.item] === undefined) pool[req.item] = availableForItem(req.item, positions)
      if (pool[req.item] >= req.quantityKg) {
        pool[req.item] -= req.quantityKg
        toApprove.push(id)
      } else {
        skipped += 1
      }
    }
    if (toApprove.length === 0) {
      toast('None of the selected requests could be covered by available stock', 'warning')
      return
    }
    bulkApproveMutation.mutate({ ids: toApprove, skipped })
  }

  const columns: Column<FertilizerRequest>[] = [
    {
      key: 'id',
      header: 'Request',
      render: (r) => (
        <div>
          <p className="font-medium text-text">{r.estateName}</p>
          <p className="id text-xs text-text-muted">
            {r.id}
            {r.orderRef && <span> · order {r.orderRef}</span>}
          </p>
        </div>
      ),
    },
    { key: 'item', header: 'Item' },
    {
      key: 'quantityKg',
      header: 'Quantity',
      align: 'right',
      render: (r) => (
        <div>
          <p className="tabular">{formatWeight(r.quantityKg)}</p>
          {r.approvedQtyKg !== undefined && r.approvedQtyKg !== r.quantityKg && (
            <p className="tabular text-xs text-text-muted">{formatWeight(r.approvedQtyKg)} approved</p>
          )}
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Stock / delivery',
      render: (r) =>
        r.status === 'Requested' ? (
          <AvailabilityCell req={r} positions={positions} batches={batches} />
        ) : r.attempt && !r.attempt.cancelled && r.attemptLabel ? (
          <div className="text-xs">
            <p className="font-medium text-text">{r.attemptLabel}</p>
            <p className="text-text-muted">
              {formatDate(r.attempt.scheduledDate)} · {r.attempt.routeName}
              {r.attempt.agentName ? ` · ${r.attempt.agentName}` : ' · no agent yet'}
              {r.attempt.covering ? ' (cover)' : ''}
            </p>
          </div>
        ) : (
          <span className="text-xs text-text-muted">Requested {formatDate(r.requestedDate)}</span>
        ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-text-muted">{PAYMENT_METHOD_LABEL[r.payment.method]}</span>
          <StatusBadge tone={PAYMENT_TONE[r.payment.status]}>
            {r.payment.status}
            {r.payment.outstandingRs > 0 ? ` · ${formatCurrency(r.payment.outstandingRs)}` : ''}
          </StatusBadge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={REQUEST_TONE[r.status]}>{r.status}</StatusBadge>
          {r.pickupMismatch && (
            <span className="flex items-center gap-1 text-xs text-warning-fg">
              <AlertTriangle className="size-3" aria-hidden /> Pickup qty differs
            </span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Fertilizer Requests"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: 'Requests' },
        ]}
        actions={
          can('fertilizer', 'edit') ? (
            <Button onClick={() => navigate('/fertilizer/requests/new')}>
              <PhoneCall className="size-4" /> Log Phoned-in Request
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={TABS}
        active={tab}
        onChange={(t) => {
          setTab(t)
          setStatus('')
          setSelected([])
        }}
        className="mb-4"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_220px_180px]">
        <Input placeholder="Search estate, item, request or order ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={TAB_STATUSES[tab].map((st) => ({ value: st, label: st }))}
        />
        <Select
          placeholder="All origins"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          options={[
            { value: 'mobile', label: 'Mobile' },
            { value: 'web', label: 'Web (phoned-in)' },
          ]}
        />
      </div>

      {canApprove && tab === 'decide' && selected.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5">
          <span className="text-sm text-text-muted">{selected.length} selected</span>
          <Button size="sm" onClick={bulkApprove} loading={bulkApproveMutation.isPending}>
            <CheckCheck className="size-4" /> Approve selected
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        selectable={canApprove && tab === 'decide'}
        onSelectionChange={setSelected}
        onRowClick={(r) => navigate(`/fertilizer/requests/${r.id}`)}
        emptyState={
          <EmptyState
            icon={<Check className="size-6" strokeWidth={1.5} />}
            title="Nothing here"
            description="Requests logged for estate owners appear here as they move through approval and delivery."
          />
        }
        actions={(r) => (
          <>
            <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/fertilizer/requests/${r.id}`)} />
            {canApprove && r.status === 'Requested' && (
              <>
                <RowAction icon={<Check className="size-4" />} label="Approve" onClick={() => navigate(`/fertilizer/requests/${r.id}`)} />
                <RowAction icon={<X className="size-4" />} label="Reject" tone="danger" onClick={() => navigate(`/fertilizer/requests/${r.id}`)} />
              </>
            )}
          </>
        )}
      />
    </div>
  )
}

function AvailabilityCell({
  req,
  positions,
  batches,
}: {
  req: FertilizerRequest
  positions: ItemPosition[]
  batches: FertilizerBatch[]
}) {
  const verdict = requestAvailability(req, positions, batches)
  const want = req.quantityKg
  const available = availableForItem(req.item, positions)

  const map = {
    covered: { cls: 'text-success-fg', text: '✓ Covered' },
    'covered-expiring': { cls: 'text-warning-fg', text: '⚠ Covered · expiring stock' },
    partial: { cls: 'text-warning-fg', text: `⚠ ${formatWeight(Math.max(0, available))} of ${formatWeight(want)}` },
    none: { cls: 'text-danger-fg', text: '✕ Not available' },
  } as const

  const v = map[verdict]
  return <span className={`text-xs font-medium ${v.cls}`}>{v.text}</span>
}
