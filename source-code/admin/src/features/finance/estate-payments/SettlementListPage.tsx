import { useNavigate } from 'react-router-dom'
import { Banknote, Eye, FileDown, Play } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { SETTLEMENTS, grossRevenue, netPayable } from './data'
import type { Settlement } from './types'
import { formatCurrency } from '@/lib/format'

/* EST-07 — settlement list. Bank payment file export per UC-054 / §10.5. */
export function SettlementListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const canProcess = can('estateOwners', 'edit')

  const columns: Column<Settlement>[] = [
    {
      key: 'estateName',
      header: 'Estate Owner',
      render: (s) => (
        <div>
          <p className="font-medium text-text">{s.estateName}</p>
          <p className="id text-xs text-text-muted">{s.id}</p>
        </div>
      ),
    },
    { key: 'period', header: 'Period' },
    { key: 'gross', header: 'Gross Revenue', align: 'right', render: (s) => formatCurrency(grossRevenue(s)) },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      render: (s) => formatCurrency(s.transportCost + s.fertilizerDeduction + s.advanceDeduction),
    },
    { key: 'net', header: 'Net Payable', align: 'right', render: (s) => formatCurrency(netPayable(s)) },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge tone={s.status === 'Processed' ? 'success' : 'warning'}>{s.status}</StatusBadge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payment Settlements"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Estate Owners', to: '/estates' }, { label: 'Settlements' }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast('Bank payment file generated (demo)')}>
              <FileDown className="size-4" /> Generate Bank Payment File
            </Button>
            {canProcess && (
              <Button onClick={() => navigate('/estates/settlements/process')}>
                <Play className="size-4" /> Process Settlement
              </Button>
            )}
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={SETTLEMENTS}
        rowKey={(s) => s.id}
        onRowClick={(s) => navigate(`/estates/${s.estateId}`)}
        emptyState={
          <EmptyState
            icon={<Banknote className="size-6" strokeWidth={1.5} />}
            title="No settlements yet"
            description="Settlement runs across estates appear here once processed."
          />
        }
        actions={(s) => (
          <>
            <RowAction icon={<Eye className="size-4" />} label="View estate" onClick={() => navigate(`/estates/${s.estateId}`)} />
            {canProcess && s.status === 'Pending' && (
              <RowAction icon={<Play className="size-4" />} label="Process" onClick={() => navigate('/estates/settlements/process')} />
            )}
          </>
        )}
      />
    </div>
  )
}
