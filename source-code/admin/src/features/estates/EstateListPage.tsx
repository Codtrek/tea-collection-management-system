import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, CircleSlash, Mountain } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { ESTATES } from './data'
import type { EstateOwner } from './types'
import { formatWeight, initials } from '@/lib/format'

/* EST-01 — roster of tea estates. Admin full CRUD; Officer view + payments; Manager view-only. */
export function EstateListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const canManage = can('estateOwners', 'approve') // register/deactivate — Administrator
  const canEdit = can('estateOwners', 'edit')

  const [search, setSearch] = useState('')
  const [route, setRoute] = useState('')
  const [status, setStatus] = useState('')
  const [deactivating, setDeactivating] = useState<EstateOwner | null>(null)

  const rows = useMemo(
    () =>
      ESTATES.filter((e) => {
        const q = search.toLowerCase()
        return (
          (e.estateName.toLowerCase().includes(q) || e.ownerName.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) &&
          (!route || e.route === route) &&
          (!status || e.status === status)
        )
      }),
    [search, route, status],
  )

  const columns: Column<EstateOwner>[] = [
    {
      key: 'estateName',
      header: 'Estate',
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-primary">
            {initials(e.estateName)}
          </span>
          <div>
            <p className="font-medium text-text">{e.estateName}</p>
            <p className="id text-xs text-text-muted">{e.id}</p>
          </div>
        </div>
      ),
    },
    { key: 'ownerName', header: 'Owner' },
    { key: 'location', header: 'Location' },
    { key: 'route', header: 'Route' },
    { key: 'ytd', header: 'YTD Deliveries', align: 'right', render: (e) => formatWeight(e.ytdDeliveriesKg) },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusBadge tone={e.status === 'Active' ? 'success' : 'danger'}>{e.status}</StatusBadge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Tea Estate Owners"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Estate Owners' }]}
        actions={
          canManage ? (
            <Button onClick={() => navigate('/estates/new')}>
              <Plus className="size-4" /> Register Estate Owner
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <Input placeholder="Search estate, owner or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          placeholder="All routes"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          options={[...new Set(ESTATES.map((e) => e.route))].sort().map((r) => ({ value: r, label: r }))}
        />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={['Active', 'Inactive'].map((s) => ({ value: s, label: s }))}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        onRowClick={(e) => navigate(`/estates/${e.id}`)}
        emptyState={
          <EmptyState
            icon={<Mountain className="size-6" strokeWidth={1.5} />}
            title="Register your first estate owner"
            description="No estates match your filters yet."
            action={canManage ? <Button size="sm" onClick={() => navigate('/estates/new')}>Register Estate Owner</Button> : undefined}
          />
        }
        actions={(e) => (
          <>
            <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/estates/${e.id}`)} />
            {canEdit && <RowAction icon={<Pencil className="size-4" />} label="Edit" onClick={() => navigate(`/estates/${e.id}/edit`)} />}
            {canManage && e.status === 'Active' && (
              <RowAction icon={<CircleSlash className="size-4" />} label="Deactivate" tone="danger" onClick={() => setDeactivating(e)} />
            )}
          </>
        )}
      />

      <LightConfirmModal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={() => {
          toast(`${deactivating?.estateName} deactivated`, 'warning')
          setDeactivating(null)
        }}
        tone="danger"
        title="Deactivate estate owner"
        confirmLabel="Deactivate"
        message={
          <>
            Deactivating <strong>{deactivating?.estateName}</strong> stops new collections and settlements for this
            estate. Historical delivery and payment records remain intact.
          </>
        }
      />
    </div>
  )
}
