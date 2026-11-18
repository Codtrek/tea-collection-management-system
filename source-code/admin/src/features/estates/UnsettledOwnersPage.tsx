import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import * as estatesService from '@/services/estates'
import { currentMonth, periodOf, readMonth, shiftMonth } from '@/lib/month'
import type { UnsettledOwner } from './types'
import { formatWeight } from '@/lib/format'

/*
  "Owners not yet settled" (Settlement-Period-View-Addendum §2): active owners with confirmed
  deliveries in the month but no settlement row. Read-only — there's no settlement generator yet.
*/
export function UnsettledOwnersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const thisMonth = currentMonth()
  const month = readMonth(searchParams.get('month'), thisMonth, shiftMonth(thisMonth, -1))
  const period = periodOf(month)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['estates', 'settlements', 'unsettled', month],
    queryFn: () => estatesService.listUnsettledOwners(month),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Couldn't load owners" description="Something went wrong." onRetry={() => void refetch()} />
  }

  const columns: Column<UnsettledOwner>[] = [
    {
      key: 'estateName',
      header: 'Estate Owner',
      render: (o) => (
        <div>
          <p className="font-medium text-text">{o.estateName}</p>
          <p className="text-xs text-text-muted">{o.ownerName}</p>
        </div>
      ),
    },
    { key: 'route', header: 'Route' },
    { key: 'deliveries', header: 'Confirmed deliveries', align: 'right' },
    { key: 'gradedKg', header: 'Graded weight', align: 'right', render: (o) => formatWeight(o.gradedKg) },
    { key: 'paymentMethod', header: 'Paid by', render: (o) => (o.paymentMethod === 'cash' ? 'Cash' : 'Bank') },
  ]

  return (
    <div>
      <PageHeader
        title="Owners not yet settled"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Settlements', to: `/estates/settlements?month=${month}` },
          { label: `Not yet settled · ${period}` },
        ]}
        description={`Active owners who delivered in ${period} but have no settlement for it.`}
      />
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(o) => o.estateId}
        onRowClick={(o) => navigate(`/estates/${o.estateId}?tab=timeline`)}
        emptyState={
          <EmptyState
            icon={<CheckCircle2 className="size-6" strokeWidth={1.5} />}
            title={`Every owner who delivered in ${period} has a settlement`}
          />
        }
      />
    </div>
  )
}
