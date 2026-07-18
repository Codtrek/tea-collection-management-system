import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, ArrowLeftRight, Sprout, BellRing } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/context/AuthContext'
import { BATCHES, batchStatus } from './data'
import { BATCH_TONE } from './status'
import type { FertilizerBatch } from './types'
import { formatDate, formatWeight } from '@/lib/format'

/* FERT-01 — central stock/batch view. Manager is view-only (§8.1.7). */
export function FertilizerStockListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canLog = can('fertilizer', 'edit')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(
    () =>
      BATCHES.filter((b) => {
        const q = search.toLowerCase()
        return (
          (b.item.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)) &&
          (!status || batchStatus(b) === status)
        )
      }),
    [search, status],
  )

  const columns: Column<FertilizerBatch>[] = [
    {
      key: 'id',
      header: 'Batch',
      render: (b) => (
        <div>
          <p className="font-medium text-text">{b.item}</p>
          <p className="id text-xs text-text-muted">{b.id}</p>
        </div>
      ),
    },
    { key: 'quantityKg', header: 'Quantity', align: 'right', render: (b) => formatWeight(b.quantityKg) },
    { key: 'receivedDate', header: 'Received', render: (b) => formatDate(b.receivedDate) },
    { key: 'expiryDate', header: 'Expires', render: (b) => formatDate(b.expiryDate) },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge tone={BATCH_TONE[batchStatus(b)]}>{batchStatus(b)}</StatusBadge>,
    },
    { key: 'location', header: 'Location' },
  ]

  return (
    <div>
      <PageHeader
        title="Fertilizer Inventory"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Fertilizer Inventory' }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/fertilizer/alerts')}>
              <BellRing className="size-4" /> Expiry Alerts
            </Button>
            {canLog && (
              <Button onClick={() => navigate('/fertilizer/movement/new')}>
                <Plus className="size-4" /> Log Stock Movement
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
        <Input placeholder="Search item or batch ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={['Fresh', 'Expiring soon', 'Expired', 'Discarded'].map((s) => ({ value: s, label: s }))}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b.id}
        onRowClick={(b) => navigate(`/fertilizer/${b.id}`)}
        emptyState={
          <EmptyState
            icon={<Sprout className="size-6" strokeWidth={1.5} />}
            title="Add your first fertilizer stock entry"
            description="No batches match your filters yet."
            action={
              canLog ? (
                <Button size="sm" onClick={() => navigate('/fertilizer/movement/new')}>
                  Log Stock Movement
                </Button>
              ) : undefined
            }
          />
        }
        actions={(b) => (
          <>
            <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/fertilizer/${b.id}`)} />
            {canLog && (
              <RowAction
                icon={<ArrowLeftRight className="size-4" />}
                label="Log Movement"
                onClick={() => navigate(`/fertilizer/movement/new?batch=${b.id}`)}
              />
            )}
          </>
        )}
      />
    </div>
  )
}
