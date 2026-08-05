import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Pencil, CircleSlash, HandCoins, Wallet, Loader2, Mountain } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as estatesService from '@/services/estates'
import { columnsForView, DIRECTORY_VIEWS, hiddenByDefault, type DirectoryView } from './directory-columns'
import type { EstateDirectoryRow } from './types'
import { initials } from '@/lib/format'

/*
  EST-01 amended — the estate owner directory. One roster, three role-driven
  views (Management/Payments/Oversight), picked by `level('estateOwners')`
  — never `user.role` (see Claude.md's "level, not role" note). Same table,
  same backend shape; only the default columns, sort, filters, primary action
  and empty state change per view.
*/
function viewFor(level: 'none' | 'view' | 'edit' | 'approve'): DirectoryView {
  if (level === 'approve') return 'management'
  if (level === 'edit') return 'payments'
  return 'oversight'
}

export function EstateListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { level } = useAuth()
  const queryClient = useQueryClient()
  const view = viewFor(level('estateOwners'))
  const config = DIRECTORY_VIEWS[view]
  const canManage = view === 'management'

  const [search, setSearch] = useState('')
  const [route, setRoute] = useState('')
  const [status, setStatus] = useState('')
  const [outstanding, setOutstanding] = useState('')
  const [deactivating, setDeactivating] = useState<EstateDirectoryRow | null>(null)

  const {
    data: estates,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ['estates', 'directory'], queryFn: estatesService.getDirectory })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => estatesService.deactivate(id),
    onSuccess: (updated) => {
      toast(`${updated.estateName} deactivated`, 'warning')
      setDeactivating(null)
      void queryClient.invalidateQueries({ queryKey: ['estates'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not deactivate this estate', 'danger'),
  })

  const rows = useMemo(
    () =>
      (estates ?? []).filter((e) => {
        const q = search.toLowerCase()
        return (
          (e.estateName.toLowerCase().includes(q) || e.ownerName.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) &&
          (!route || e.route === route) &&
          (!status || e.status === status) &&
          (!outstanding || (outstanding === 'yes' ? e.hasOutstanding : !e.hasOutstanding))
        )
      }),
    [estates, search, route, status, outstanding],
  )

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Couldn't load estates" description="Something went wrong fetching the estate roster." onRetry={() => void refetch()} />
  }

  const nameColumn: Column<EstateDirectoryRow> = {
    key: 'estateName',
    header: 'Estate',
    sortable: true,
    sortValue: (e) => e.estateName,
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
  }
  const columns = columnsForView(view).map((c) => (c.key === 'estateName' ? nameColumn : c))

  const primaryAction =
    config.primaryAction === 'register' ? (
      <Button onClick={() => navigate('/estates/new')}>
        <Plus className="size-4" /> Register Estate Owner
      </Button>
    ) : config.primaryAction === 'issueAdvance' ? (
      <Button onClick={() => navigate('/estates/advances/new')}>
        <HandCoins className="size-4" /> Issue Advance Payment
      </Button>
    ) : undefined

  return (
    <div>
      <PageHeader
        title="Estate Owners"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Estate Owners' }]}
        actions={primaryAction}
      />

      <div
        className={
          config.hasOutstandingFilter
            ? 'mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px_180px]'
            : 'mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]'
        }
      >
        <Input placeholder="Search estate, owner or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          placeholder="All routes"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          options={[...new Set((estates ?? []).map((e) => e.route))].sort().map((r) => ({ value: r, label: r }))}
        />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={['Active', 'Inactive'].map((s) => ({ value: s, label: s }))}
        />
        {config.hasOutstandingFilter && (
          <Select
            placeholder="Outstanding: any"
            value={outstanding}
            onChange={(e) => setOutstanding(e.target.value)}
            options={[
              { value: 'yes', label: 'Outstanding: Yes' },
              { value: 'no', label: 'Outstanding: No' },
            ]}
          />
        )}
      </div>

      <DataTable
        key={view}
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        onRowClick={(e) => navigate(`/estates/${e.id}`)}
        defaultSort={config.defaultSort}
        columnPrefsKey={`estate-directory-${view}`}
        initialHidden={hiddenByDefault(view)}
        emptyState={
          <EmptyState
            icon={<Mountain className="size-6" strokeWidth={1.5} />}
            title={config.emptyTitle}
            description={config.emptyDescription}
            action={canManage ? <Button size="sm" onClick={() => navigate('/estates/new')}>Register Estate Owner</Button> : undefined}
          />
        }
        actions={(e) => (
          <>
            <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/estates/${e.id}`)} />
            {view === 'payments' && (
              <>
                <RowAction
                  icon={<HandCoins className="size-4" />}
                  label="Issue Advance"
                  onClick={() => navigate(`/estates/advances/new?estate=${e.id}`)}
                />
                <RowAction
                  icon={<Wallet className="size-4" />}
                  label="View payments"
                  onClick={() => navigate(`/estates/${e.id}?tab=payments`)}
                />
              </>
            )}
            {view === 'management' && (
              <RowAction icon={<Pencil className="size-4" />} label="Edit" onClick={() => navigate(`/estates/${e.id}/edit`)} />
            )}
            {canManage && e.status === 'Active' && (
              <RowAction icon={<CircleSlash className="size-4" />} label="Deactivate" tone="danger" onClick={() => setDeactivating(e)} />
            )}
          </>
        )}
      />

      <LightConfirmModal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating.id)}
        loading={deactivateMutation.isPending}
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
