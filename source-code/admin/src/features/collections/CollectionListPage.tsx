import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Eye, Pencil, Leaf, Loader2, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/context/AuthContext'
import * as collectionsService from '@/services/collections'
import { COLLECTION_TONE, isLocked } from './status'
import type { CollectionRecord, CollectionStatus } from './types'
import { formatDate, formatWeight } from '@/lib/format'

/* COL-01 — factory-wide oversight log of collection/delivery records. */
export function CollectionListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canLog = can('collection', 'edit') // Officer/Admin log exception entries

  const {
    data: collections,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ['collections'], queryFn: collectionsService.list })

  const [search, setSearch] = useState('')
  const [route, setRoute] = useState('')
  const [grade, setGrade] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return (collections ?? []).filter(
      (c) =>
        (c.estateName.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) &&
        (!route || c.route === route) &&
        (!grade || c.grade === grade) &&
        (!status || c.status === status),
    )
  }, [collections, search, route, grade, status])

  const columns: Column<CollectionRecord>[] = [
    {
      key: 'id',
      header: 'Delivery',
      render: (c) => (
        <div>
          <p className="font-medium text-text">{c.estateName}</p>
          <p className="id text-xs text-text-muted">{c.id}</p>
        </div>
      ),
    },
    { key: 'route', header: 'Route' },
    { key: 'weightKg', header: 'Weight', align: 'right', render: (c) => formatWeight(c.weightKg) },
    {
      key: 'grade',
      header: 'Grade',
      render: (c) =>
        c.grade === 'Pending' ? (
          <span className="text-xs text-text-muted">Pending</span>
        ) : (
          <StatusBadge tone={c.grade === 'Super' ? 'gradeSuper' : 'gradeNormal'}>{c.grade}</StatusBadge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <StatusBadge
          tone={COLLECTION_TONE[c.status]}
          // upload icon marks the web-originated provisional state apart from "Collected"
          icon={c.status === 'Pending Agent Confirmation' ? <Upload /> : undefined}
        >
          {c.status}
        </StatusBadge>
      ),
    },
    { key: 'date', header: 'Date', render: (c) => formatDate(c.date) },
  ]

  return (
    <div>
      <PageHeader
        title="Tea Leaf Collection"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Tea Leaf Collection' }]}
        actions={
          canLog ? (
            <Button onClick={() => navigate('/collections/new')}>
              <Plus className="size-4" /> Log Exception Entry
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_150px_150px_220px]">
        <Input placeholder="Search estate or delivery ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          placeholder="All routes"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          options={[...new Set((collections ?? []).map((c) => c.route))].sort().map((r) => ({ value: r, label: r }))}
        />
        <Select
          placeholder="All grades"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          options={['Super', 'Normal', 'Pending'].map((g) => ({ value: g, label: g }))}
        />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={(Object.keys(COLLECTION_TONE) as CollectionStatus[]).map((s) => ({ value: s, label: s }))}
        />
      </div>

      {isPending ? (
        <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface py-16">
          <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/collections/${c.id}`)}
          emptyState={
            <EmptyState
              icon={<Leaf className="size-6" strokeWidth={1.5} />}
              title="No collection records yet"
              description="This log fills from the mobile field flow — an empty list is normal early on, not an error."
            />
          }
          actions={(c) => (
            <>
              <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/collections/${c.id}`)} />
              {canLog && !isLocked(c) && (
                <RowAction icon={<Pencil className="size-4" />} label="Edit" onClick={() => navigate(`/collections/${c.id}/edit`)} />
              )}
            </>
          )}
        />
      )}
    </div>
  )
}
