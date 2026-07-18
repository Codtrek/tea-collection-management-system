import { useNavigate } from 'react-router-dom'
import { Plus, Eye, HandCoins } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { ADVANCES } from './data'
import type { Advance, AdvanceStatus } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

const tone: Record<AdvanceStatus, BadgeTone> = { Pending: 'warning', Approved: 'success', Rejected: 'danger' }

export function AdvanceListPage() {
  const navigate = useNavigate()

  const columns: Column<Advance>[] = [
    { key: 'employeeName', header: 'Employee', render: (a) => <span className="font-medium text-text">{a.employeeName}</span> },
    { key: 'id', header: 'Reference', render: (a) => <span className="id text-xs text-text-muted">{a.id}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => formatCurrency(a.amount) },
    { key: 'dateRequested', header: 'Requested', render: (a) => formatDate(a.dateRequested) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge tone={tone[a.status]}>{a.status}</StatusBadge> },
  ]

  return (
    <div>
      <PageHeader
        title="Salary Advances"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Salary Advances' }]}
        actions={<Button><Plus className="size-4" /> New Advance Request</Button>}
      />
      <DataTable
        columns={columns}
        rows={ADVANCES}
        rowKey={(a) => a.id}
        onRowClick={(a) => navigate(`/employees/advances/${a.id}`)}
        emptyState={<EmptyState icon={<HandCoins className="size-6" strokeWidth={1.5} />} title="No advance requests yet" description="Requests submitted by employees appear here." />}
        actions={(a) => <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/employees/advances/${a.id}`)} />}
      />
    </div>
  )
}
