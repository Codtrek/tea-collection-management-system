import { useNavigate } from 'react-router-dom'
import { Plus, Eye, HandCoins } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { ESTATE_ADVANCES } from './data'
import type { EstateAdvance } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

/* EST-05 — advances issued to estates; deducted at the next settlement. */
export function EstateAdvanceListPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canIssue = can('estateOwners', 'edit')

  const columns: Column<EstateAdvance>[] = [
    {
      key: 'estateName',
      header: 'Estate Owner',
      render: (a) => (
        <div>
          <p className="font-medium text-text">{a.estateName}</p>
          <p className="id text-xs text-text-muted">{a.id}</p>
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => formatCurrency(a.amount) },
    { key: 'dateIssued', header: 'Date Issued', render: (a) => formatDate(a.dateIssued) },
    { key: 'issuedBy', header: 'Issued by' },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge tone={a.status === 'Deducted' ? 'success' : 'warning'}>{a.status}</StatusBadge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Estate Advance Payments"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Estate Owners', to: '/estates' }, { label: 'Advances' }]}
        actions={
          canIssue ? (
            <Button onClick={() => navigate('/estates/advances/new')}>
              <Plus className="size-4" /> Issue Advance Payment
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        rows={ESTATE_ADVANCES}
        rowKey={(a) => a.id}
        onRowClick={(a) => navigate(`/estates/${a.estateId}`)}
        emptyState={
          <EmptyState
            icon={<HandCoins className="size-6" strokeWidth={1.5} />}
            title="No advances issued yet"
            description="Advance payments issued to estate owners appear here."
            action={canIssue ? <Button size="sm" onClick={() => navigate('/estates/advances/new')}>Issue Advance</Button> : undefined}
          />
        }
        actions={(a) => (
          <RowAction icon={<Eye className="size-4" />} label="View estate" onClick={() => navigate(`/estates/${a.estateId}`)} />
        )}
      />
    </div>
  )
}
