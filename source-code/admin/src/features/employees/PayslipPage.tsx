import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, Printer, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as employeesService from '@/services/employees'
import { netPay } from './calc'
import { formatCurrency, maskAccount } from '@/lib/format'

export function PayslipPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // No "get one payroll row" endpoint yet — fetch the (dev-scale) full list and find by id.
  const { data: payroll, isPending: payrollPending, isError: payrollError, refetch: refetchPayroll } = useQuery({
    queryKey: ['employees', 'payroll'],
    queryFn: () => employeesService.listPayroll(),
  })
  const row = (payroll ?? []).find((r) => r.id === id)

  const { data: employee, isPending: employeePending } = useQuery({
    queryKey: ['employee', row?.employeeId],
    queryFn: () => employeesService.getById(row!.employeeId),
    enabled: !!row,
  })

  if (payrollPending || (row && employeePending)) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (payrollError || !row) {
    return <ErrorState title="Payslip not found" description={`No payroll record with ID “${id}”.`} onRetry={() => void refetchPayroll()} />
  }

  return (
    <div>
      <PageHeader
        title="Payslip"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Payroll', to: '/employees/payroll' }, { label: row.employeeName }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => toast('Payslip downloaded')}><Download className="size-4" /> Download PDF</Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
          </div>
        }
      />

      <Card className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <p className="text-lg font-semibold text-text-heading">{row.employeeName}</p>
            <p className="id text-[13px] text-text-muted">{row.employeeId} · {row.period}</p>
          </div>
          <StatusBadge tone={row.status === 'Processed' ? 'success' : 'warning'}>{row.status}</StatusBadge>
        </div>

        <div className="grid gap-6 py-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Earnings</p>
            <Line label="Gross salary" value={formatCurrency(row.gross)} />
            {row.shiftHours && row.rates && (
              <>
                <Line label={`Day (${row.shiftHours.day}h @ ${formatCurrency(row.rates.day)})`} value={formatCurrency(row.shiftHours.day * row.rates.day)} />
                <Line label={`Day OT (${row.shiftHours.dayOt}h @ ${formatCurrency(row.rates.dayOt)})`} value={formatCurrency(row.shiftHours.dayOt * row.rates.dayOt)} />
                <Line label={`Night (${row.shiftHours.night}h @ ${formatCurrency(row.rates.night)})`} value={formatCurrency(row.shiftHours.night * row.rates.night)} />
                <Line label={`Night OT (${row.shiftHours.nightOt}h @ ${formatCurrency(row.rates.nightOt)})`} value={formatCurrency(row.shiftHours.nightOt * row.rates.nightOt)} />
              </>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Deductions</p>
            <Line label="Salary advances" value={formatCurrency(row.deductions.advances)} />
            <Line label="Other" value={formatCurrency(row.deductions.other)} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-text">Net Pay</span>
          <span className="tabular text-xl font-semibold text-text-heading">{formatCurrency(netPay(row))}</span>
        </div>

        {employee?.bank.account && (
          <p className="mt-3 text-xs text-text-muted">
            Bank transfer to {employee.bank.bank} · <span className="id">{maskAccount(employee.bank.account)}</span>
          </p>
        )}
      </Card>

      <div className="mx-auto mt-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees/payroll')}>← Back to payroll</Button>
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className="tabular text-text">{value}</span>
    </div>
  )
}
