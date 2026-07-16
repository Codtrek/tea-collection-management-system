import { useNavigate } from 'react-router-dom'
import { PlayCircle, FileSpreadsheet, FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { PAYROLL, netPay } from './data'
import type { PayrollRow } from './types'
import { formatCurrency } from '@/lib/format'

export function PayrollListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const canProcess = can('payroll', 'edit')

  const columns: Column<PayrollRow>[] = [
    { key: 'employeeName', header: 'Employee', render: (r) => <span className="font-medium text-text">{r.employeeName}</span> },
    { key: 'period', header: 'Pay Period' },
    { key: 'gross', header: 'Gross', align: 'right', render: (r) => formatCurrency(r.gross) },
    { key: 'deductions', header: 'Deductions', align: 'right', render: (r) => formatCurrency(r.deductions.advances + r.deductions.other) },
    { key: 'net', header: 'Net Payable', align: 'right', render: (r) => <span className="font-medium">{formatCurrency(netPay(r))}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.missingBank ? (
          <StatusBadge tone="danger">Missing bank</StatusBadge>
        ) : (
          <StatusBadge tone={r.status === 'Processed' ? 'success' : 'warning'}>{r.status}</StatusBadge>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payroll"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Payroll' }]}
        description="July 2026 run"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => toast('Bank payment file generated')}>
              <FileSpreadsheet className="size-4" /> Bank File
            </Button>
            {canProcess && (
              <Button size="sm" onClick={() => navigate('/employees/payroll/process')}>
                <PlayCircle className="size-4" /> Process Payroll
              </Button>
            )}
          </div>
        }
      />
      <DataTable
        columns={columns}
        rows={PAYROLL}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/employees/payroll/${r.id}/payslip`)}
        emptyState={
          <EmptyState
            icon={<FileText className="size-6" strokeWidth={1.5} />}
            title="No payroll run for this period yet"
            action={canProcess ? <Button size="sm" onClick={() => navigate('/employees/payroll/process')}>Process Payroll</Button> : undefined}
          />
        }
        actions={(r) => <RowAction icon={<FileText className="size-4" />} label="View Payslip" onClick={() => navigate(`/employees/payroll/${r.id}/payslip`)} />}
      />
    </div>
  )
}
