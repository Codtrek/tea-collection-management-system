import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PhoneCall, Check, X, Eye, CheckCheck, Loader2 } from 'lucide-react'
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
import { REQUEST_TONE } from './status'
import type { FertilizerBatch, FertilizerRequest, ItemPosition, RequestStatus } from './types'
import { formatDate, formatWeight } from '@/lib/format'

/* FERT-05 — the approval work queue where an estate owner's request lands (addendum §6). */

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'all', label: 'All' },
]

const TAB_STATUSES: Record<string, RequestStatus[]> = {
  pending: ['Submitted'],
  approved: ['Approved', 'Partially Dispatched'],
  dispatched: ['Dispatched', 'Deducted'],
  all: ['Submitted', 'Approved', 'Partially Dispatched', 'Dispatched', 'Deducted', 'Rejected', 'Cancelled'],
}

export function RequestQueuePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canApprove = can('fertilizer', 'approve')

  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState('')
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
          (!origin || r.origin === origin) &&
          (r.estateName.toLowerCase().includes(q) || r.item.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        // oldest first while pending (waiting longest = decide first); newest first elsewhere
        tab === 'pending' ? a.requestedDate.localeCompare(b.requestedDate) : b.requestedDate.localeCompare(a.requestedDate),
      )
  }, [requests, tab, search, origin])

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
      if (!req || req.status !== 'Submitted') continue
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
          <p className="id text-xs text-text-muted">{r.id}</p>
        </div>
      ),
    },
    { key: 'item', header: 'Item' },
    { key: 'quantityKg', header: 'Quantity', align: 'right', render: (r) => formatWeight(r.quantityKg) },
    { key: 'requestedDate', header: 'Requested', render: (r) => formatDate(r.requestedDate) },
    { key: 'availability', header: 'Availability', render: (r) => <AvailabilityCell req={r} positions={positions} batches={batches} /> },
    {
      key: 'origin',
      header: 'Origin',
      render: (r) => <span className="text-xs capitalize text-text-muted">{r.origin}</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge tone={REQUEST_TONE[r.status]}>{r.status}</StatusBadge> },
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

      <Tabs tabs={TABS} active={tab} onChange={(t) => { setTab(t); setSelected([]) }} className="mb-4" />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
        <Input placeholder="Search estate, item, or request ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
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

      {canApprove && tab === 'pending' && selected.length > 0 && (
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
        selectable={canApprove && tab === 'pending'}
        onSelectionChange={setSelected}
        onRowClick={(r) => navigate(`/fertilizer/requests/${r.id}`)}
        emptyState={
          <EmptyState
            icon={<Check className="size-6" strokeWidth={1.5} />}
            title="No pending fertilizer requests"
            description="Requests submitted by estate owners appear here for approval."
          />
        }
        actions={(r) => (
          <>
            <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/fertilizer/requests/${r.id}`)} />
            {canApprove && r.status === 'Submitted' && (
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
  const want = req.status === 'Submitted' ? req.quantityKg : (req.approvedQtyKg ?? req.quantityKg)
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
