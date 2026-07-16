import { useNavigate, useParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { PAYROLL, netPay } from './data'
import { formatCurrency, maskAccount } from '@/lib/format'
import { EMPLOYEES } from './data'

export function PayslipPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const row = PAYROLL.find((r) => r.id === id) ?? PAYROLL[0]
  const emp = EMPLOYEES.find((e) => e.id === row.employeeId)

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

        {emp?.bank.account && (
          <p className="mt-3 text-xs text-text-muted">
            Bank transfer to {emp.bank.bank} · <span className="id">{maskAccount(emp.bank.account)}</span>
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
