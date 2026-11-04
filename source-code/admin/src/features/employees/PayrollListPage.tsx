import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlayCircle, RefreshCw, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as employeesService from '@/services/employees'
import { netPay } from './calc'
import type { PayrollRow } from './types'
import { formatCurrency } from '@/lib/format'

const PERIOD = 'July 2026'

export function PayrollListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canProcess = can('payroll', 'edit')

  const { data: payroll, isPending, isError, refetch } = useQuery({
    queryKey: ['employees', 'payroll', PERIOD],
    queryFn: () => employeesService.listPayroll(PERIOD),
  })

  const generateMutation = useMutation({
    mutationFn: () => employeesService.generatePayroll(PERIOD),
    onSuccess: () => {
      toast(`Payroll generated from attendance for ${PERIOD}`)
      void queryClient.invalidateQueries({ queryKey: ['employees', 'payroll'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not generate payroll', 'danger'),
  })

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

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Couldn't load payroll" description="Something went wrong fetching this pay period." onRetry={() => void refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="Payroll"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Payroll' }]}
        description={`${PERIOD} run`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => toast('Bank payment file generated')}>
              <FileSpreadsheet className="size-4" /> Bank File
            </Button>
            {canProcess && (
              <Button variant="secondary" size="sm" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
                <RefreshCw className="size-4" /> Generate from Attendance
              </Button>
            )}
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
        rows={payroll ?? []}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/employees/payroll/${r.id}/payslip`)}
        emptyState={
          <EmptyState
            icon={<FileText className="size-6" strokeWidth={1.5} />}
            title="No payroll run for this period yet"
            action={canProcess ? <Button size="sm" onClick={() => generateMutation.mutate()}>Generate from Attendance</Button> : undefined}
          />
        }
        actions={(r) => <RowAction icon={<FileText className="size-4" />} label="View Payslip" onClick={() => navigate(`/employees/payroll/${r.id}/payslip`)} />}
      />
    </div>
  )
}
