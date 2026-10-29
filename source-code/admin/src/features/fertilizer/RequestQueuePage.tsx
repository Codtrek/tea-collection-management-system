import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PhoneCall, Check, X, Eye, Loader2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as fertilizerService from '@/services/fertilizer'
import {
  availabilityLabel,
  QUEUE_TAB_STATUSES,
  QUEUE_TABS,
  queueParams,
  queueRows,
  readQueueFilters,
  type QueueFilters,
} from './lib'
import { PAYMENT_METHOD_LABEL, PAYMENT_TONE, REQUEST_TONE } from './status'
import type { FertilizerRequest } from './types'
import { formatCurrency, formatDate, formatWeight } from '@/lib/format'

/*
  FERT-05 — the fertilizer work queue (Fertilizer-Delivery-Addendum §10): requests to decide,
  approved stock waiting for its route stop, deliveries in play, the ones that need a decision
  after repeated failures, and the closed ones. Shows each request's attempt, delivery date and
  agent, payment method and payment status.

  Review on the page, confirm in a modal: approving commits stock, so it happens only on FERT-06
  (no bulk approve). Rejecting commits nothing, so a row can be rejected here with a reason.
  The filters live in the URL — FERT-06's "Back to queue" / "Next request" keep them.
*/

export function RequestQueuePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  // data-driven: the Officer's approval is its own permission key (the Administrator audits)
  const canApprove = can('fertilizerApproval', 'approve')

  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readQueueFilters(searchParams)
  const setFilters = (patch: Partial<QueueFilters>) =>
    setSearchParams(queueParams({ ...filters, ...patch }), { replace: true })

  const [rejecting, setRejecting] = useState<FertilizerRequest | null>(null)
  const [reason, setReason] = useState('')

  const {
    data: requests,
    isPending: requestsPending,
    isError: requestsError,
    refetch: refetchRequests,
  } = useQuery({ queryKey: ['fertilizer', 'requests'], queryFn: fertilizerService.listRequests })

  const rejectMutation = useMutation({
    mutationFn: ({ id, why }: { id: string; why: string }) => fertilizerService.decideRequest(id, { decision: 'reject', reason: why }),
    onSuccess: (updated) => {
      toast(`${updated.id} rejected`)
      setRejecting(null)
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not reject the request', 'danger'),
  })

  const rows = useMemo(
    () => queueRows(requests ?? [], { tab: filters.tab, search: filters.search, status: filters.status, origin: filters.origin }),
    [requests, filters.tab, filters.search, filters.status, filters.origin],
  )
  // FERT-06 is opened with the queue's filters, for its "Back to queue" and "Next request"
  const openRequest = (id: string) => {
    const from = queueParams(filters).toString()
    navigate(`/fertilizer/requests/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`)
  }

  if (requestsPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (requestsError || !requests) {
    return (
      <ErrorState
        title="Couldn't load fertilizer requests"
        description="Something went wrong fetching request and stock data."
        onRetry={() => void refetchRequests()}
      />
    )
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
          <AvailabilityCell req={r} />
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

      <Tabs tabs={QUEUE_TABS} active={filters.tab} onChange={(t) => setFilters({ tab: t, status: '' })} className="mb-4" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_220px_180px]">
        <Input
          placeholder="Search estate, item, request or order ID…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
        <Select
          placeholder="All statuses"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          options={QUEUE_TAB_STATUSES[filters.tab].map((st) => ({ value: st, label: st }))}
        />
        <Select
          placeholder="All origins"
          value={filters.origin}
          onChange={(e) => setFilters({ origin: e.target.value })}
          options={[
            { value: 'mobile', label: 'Mobile' },
            { value: 'web', label: 'Web (phoned-in)' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => openRequest(r.id)}
        emptyState={
          <EmptyState
            icon={<Check className="size-6" strokeWidth={1.5} />}
            title="Nothing here"
            description="Requests logged for estate owners appear here as they move through approval and delivery."
          />
        }
        actions={(r) => (
          <>
            <RowAction icon={<Eye className="size-4" />} label="Review" onClick={() => openRequest(r.id)} />
            {canApprove && r.status === 'Requested' && (
              <RowAction
                icon={<X className="size-4" />}
                label="Reject"
                tone="danger"
                onClick={() => {
                  setReason('')
                  setRejecting(r)
                }}
              />
            )}
          </>
        )}
      />

      {rejecting && (
        <LightConfirmModal
          open
          onClose={() => setRejecting(null)}
          onConfirm={() => rejectMutation.mutate({ id: rejecting.id, why: reason.trim() })}
          loading={rejectMutation.isPending}
          confirmDisabled={!reason.trim()}
          tone="danger"
          title="Reject request"
          confirmLabel="Reject"
          message={
            <>
              Reject {rejecting.id}: {formatWeight(rejecting.quantityKg)} of {rejecting.item} for {rejecting.estateName}? The
              reason is shown to the owner. To approve, open the request — approval commits stock.
            </>
          }
        >
          <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
        </LightConfirmModal>
      )}
    </div>
  )
}

/** The server's verdict (same stock-position service as FERT-01) in words — "expiring" names the batch. */
function AvailabilityCell({ req }: { req: FertilizerRequest }) {
  const { text, tone } = availabilityLabel(req.availability, req.quantityKg)
  const cls = { success: 'text-success-fg', warning: 'text-warning-fg', danger: 'text-danger-fg' }[tone]
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>
}
