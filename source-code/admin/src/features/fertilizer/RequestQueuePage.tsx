import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCall, Check, X, Eye, CheckCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { REQUESTS } from './data'
import { availableForItem, requestAvailability } from './position'
import { REQUEST_TONE } from './status'
import type { FertilizerRequest, RequestStatus } from './types'
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
  const canApprove = can('fertilizer', 'approve')

  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const rows = useMemo(() => {
    const allowed = TAB_STATUSES[tab]
    const q = search.trim().toLowerCase()
    return REQUESTS.filter(
      (r) =>
        allowed.includes(r.status) &&
        (!origin || r.origin === origin) &&
        (r.estateName.toLowerCase().includes(q) || r.item.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)),
    ).sort((a, b) =>
      // oldest first while pending (waiting longest = decide first); newest first elsewhere
      tab === 'pending' ? a.requestedDate.localeCompare(b.requestedDate) : b.requestedDate.localeCompare(a.requestedDate),
    )
  }, [tab, search, origin])

  const bulkApprove = () => {
    // Re-check availability at submit against a running pool — approving in sequence
    // consumes the same stock, so a later selection may no longer be coverable (§6).
    const pool: Record<string, number> = {}
    let approved = 0
    let skipped = 0
    for (const id of selected) {
      const req = REQUESTS.find((r) => r.id === id)
      if (!req || req.status !== 'Submitted') continue
      if (pool[req.item] === undefined) pool[req.item] = availableForItem(req.item)
      if (pool[req.item] >= req.quantityKg) {
        pool[req.item] -= req.quantityKg
        approved += 1
      } else {
        skipped += 1
      }
    }
    if (approved) toast(`Approved ${approved} request${approved > 1 ? 's' : ''}${skipped ? ` · ${skipped} skipped (insufficient stock)` : ''}`)
    else toast('None of the selected requests could be covered by available stock', 'warning')
    setSelected([])
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
    { key: 'availability', header: 'Availability', render: (r) => <AvailabilityCell req={r} /> },
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
          <Button size="sm" onClick={bulkApprove}>
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

function AvailabilityCell({ req }: { req: FertilizerRequest }) {
  const verdict = requestAvailability(req)
  const want = req.status === 'Submitted' ? req.quantityKg : (req.approvedQtyKg ?? req.quantityKg)
  const available = availableForItem(req.item)

  const map = {
    covered: { cls: 'text-success-fg', text: '✓ Covered' },
    'covered-expiring': { cls: 'text-warning-fg', text: '⚠ Covered · expiring stock' },
    partial: { cls: 'text-warning-fg', text: `⚠ ${formatWeight(Math.max(0, available))} of ${formatWeight(want)}` },
    none: { cls: 'text-danger-fg', text: '✕ Not available' },
  } as const

  const v = map[verdict]
  return <span className={`text-xs font-medium ${v.cls}`}>{v.text}</span>
}
