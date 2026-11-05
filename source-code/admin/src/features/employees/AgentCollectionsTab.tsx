import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Leaf, Loader2 } from 'lucide-react'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { GradeChips } from '@/features/collections/GradeChips'
import { COLLECTION_TONE } from '@/features/collections/status'
import type { CollectionStatus } from '@/features/collections/types'
import * as employeesService from '@/services/employees'
import { formatDate, formatWeight } from '@/lib/format'
import type { AgentHistoryRow } from './types'

const PAGE_SIZE = 25

/*
  A Tea Collecting Agent's collection history, on their EMPLOYEE page (the dispatch board's
  "View history" lands here). Server-side pagination, last 90 days by default; "View all"
  widens the range — same contract as the Estate Owner tabs. Deliveries made while covering
  another agent's route are marked "Covering Route X".
*/
export function AgentCollectionsTab({ employeeId }: { employeeId: string }) {
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(0)

  const query = useQuery({
    queryKey: ['employee', employeeId, 'collections', showAll, page],
    queryFn: () =>
      employeesService.getCollections(employeeId, {
        ...(showAll ? { from: '2000-01-01' } : {}),
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: Column<AgentHistoryRow>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    {
      key: 'route',
      header: 'Route',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <span>{r.route}</span>
          {r.coveringRoute && <StatusBadge tone="warning">Covering {r.coveringRoute}</StatusBadge>}
        </div>
      ),
    },
    { key: 'estateName', header: 'Estate' },
    {
      key: 'weightKg',
      header: 'Weight',
      align: 'right',
      render: (r) => (
        <div>
          <p className="tabular">{formatWeight(r.weightKg)}</p>
          {r.graded && r.estateWeightKg !== r.weightKg && (
            <p className="tabular text-xs text-text-muted">Estate {formatWeight(r.estateWeightKg)}</p>
          )}
        </div>
      ),
    },
    { key: 'grade', header: 'Grade', render: (r) => <GradeChips record={r} /> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge tone={COLLECTION_TONE[r.status as CollectionStatus] ?? 'neutral'}>{r.status}</StatusBadge>,
    },
  ]

  if (query.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (query.isError) return <ErrorState title="Couldn't load this tab" onRetry={() => void query.refetch()} />

  const data = query.data
  const pageCount = Math.max(1, Math.ceil(data.total / data.limit))

  return (
    <div className="flex flex-col gap-3">
      {!showAll && (
        <p className="text-xs text-text-muted">
          Showing last 90 days ({data.total}) ·{' '}
          <button
            type="button"
            onClick={() => {
              setShowAll(true)
              setPage(0)
            }}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            View all
          </button>
        </p>
      )}

      <DataTable
        columns={columns}
        rows={data.rows}
        rowKey={(r) => r.id}
        pageSize={PAGE_SIZE}
        onRowClick={(r) => navigate(`/collections/${r.id}`)}
        emptyState={
          <EmptyState
            icon={<Leaf className="size-6" strokeWidth={1.5} />}
            title="No collections in this period"
            description={showAll ? 'This agent has not collected anything yet.' : 'Nothing collected in the last 90 days — try “View all”.'}
          />
        }
      />

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-text-muted">
          <span className="tabular">
            Page {data.page + 1} of {pageCount}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={!data.hasMore} aria-label="Next page">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
