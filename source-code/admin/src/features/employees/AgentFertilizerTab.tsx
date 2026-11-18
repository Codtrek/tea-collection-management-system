import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, Sprout } from 'lucide-react'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { REQUEST_TONE } from '@/features/fertilizer/status'
import * as employeesService from '@/services/employees'
import { formatDate, formatWeight } from '@/lib/format'
import type { AgentFertilizerRow } from './types'

const PAGE_SIZE = 25

/*
  The fertilizer a Tea Collecting Agent took out, on their EMPLOYEE page beside Collections:
  every finished attempt he was handed — delivered, part delivered or failed. Same contract as
  the Collections tab (server-side pages, last 90 days, "View all"). A row opens its request.
*/
export function AgentFertilizerTab({ employeeId }: { employeeId: string }) {
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(0)

  const query = useQuery({
    queryKey: ['employee', employeeId, 'fertilizer-deliveries', showAll, page],
    queryFn: () =>
      employeesService.getFertilizerDeliveries(employeeId, {
        ...(showAll ? { from: '2000-01-01' } : {}),
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: Column<AgentFertilizerRow>[] = [
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
    { key: 'item', header: 'Item' },
    {
      key: 'deliveredKg',
      header: 'Delivered',
      align: 'right',
      render: (r) => (
        <div>
          <p className="tabular">{formatWeight(r.deliveredKg)}</p>
          {r.handedOverKg !== null && r.handedOverKg !== r.deliveredKg && (
            <p className="tabular text-xs text-text-muted">Took {formatWeight(r.handedOverKg)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={REQUEST_TONE[r.outcome]}>{r.outcome}</StatusBadge>
          {(r.failReason || r.note) && (
            <span className="text-xs text-text-muted">{[r.failReason, r.note].filter(Boolean).join(' — ')}</span>
          )}
        </div>
      ),
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
        rowKey={(r) => String(r.deliveryId)}
        pageSize={PAGE_SIZE}
        onRowClick={(r) => r.requestId && navigate(`/fertilizer/requests/${r.requestId}`)}
        emptyState={
          <EmptyState
            icon={<Sprout className="size-6" strokeWidth={1.5} />}
            title="No fertilizer deliveries in this period"
            description={showAll ? 'This agent has not delivered any fertilizer yet.' : 'Nothing delivered in the last 90 days — try “View all”.'}
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
