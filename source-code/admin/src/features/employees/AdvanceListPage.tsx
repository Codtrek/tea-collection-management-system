import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Eye, HandCoins, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import * as employeesService from '@/services/employees'
import type { Advance, AdvanceStatus } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

const tone: Record<AdvanceStatus, BadgeTone> = { Pending: 'warning', Approved: 'success', Rejected: 'danger' }

export function AdvanceListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canRequest = can('advances', 'edit')

  const { data: advances, isPending, isError, refetch } = useQuery({ queryKey: ['employees', 'advances'], queryFn: employeesService.listAdvances })

  const columns: Column<Advance>[] = [
    { key: 'employeeName', header: 'Employee', render: (a) => <span className="font-medium text-text">{a.employeeName}</span> },
    { key: 'id', header: 'Reference', render: (a) => <span className="id text-xs text-text-muted">{a.id}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => formatCurrency(a.amount) },
    { key: 'dateRequested', header: 'Requested', render: (a) => formatDate(a.dateRequested) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge tone={tone[a.status]}>{a.status}</StatusBadge> },
  ]

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Couldn't load advances" description="Something went wrong fetching salary advance requests." onRetry={() => void refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="Salary Advances"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Salary Advances' }]}
        actions={
          canRequest ? (
            <Button onClick={() => navigate('/employees/advances/new')}>
              <Plus className="size-4" /> New Advance Request
            </Button>
          ) : undefined
        }
      />
      <DataTable
        columns={columns}
        rows={advances ?? []}
        rowKey={(a) => a.id}
        onRowClick={(a) => navigate(`/employees/advances/${a.id}`)}
        emptyState={<EmptyState icon={<HandCoins className="size-6" strokeWidth={1.5} />} title="No advance requests yet" description="Requests submitted by employees appear here." />}
        actions={(a) => <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/employees/advances/${a.id}`)} />}
      />
    </div>
  )
}
