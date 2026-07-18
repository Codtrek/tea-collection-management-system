import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HighStakesConfirmFlow } from '@/components/patterns/HighStakesConfirmFlow'
import { useToast } from '@/components/ui/Toast'
import { PAYROLL, netPay } from './data'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

/* EMP-12 — first build of HighStakesConfirmFlow. Employees missing bank details
   are excluded and flagged (UC-054 exception flow); confirmation requires the
   user to re-type the total before the irreversible run. */
export function PayrollProcessingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const included = PAYROLL.filter((r) => !r.missingBank)
  const excluded = PAYROLL.filter((r) => r.missingBank)
  const total = included.reduce((sum, r) => sum + netPay(r), 0)

  return (
    <div>
      <PageHeader
        title="Process Payroll"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Payroll', to: '/employees/payroll' }, { label: 'Process' }]}
      />

      {/* Period header */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Pay period" value="July 2026" />
        <SummaryTile label="Employees" value={`${included.length} included`} />
        <SummaryTile label="Total payable" value={formatCurrency(total)} highlight />
      </div>

      {excluded.length > 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-danger-fg/20 bg-danger-bg/60 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-fg" />
          <p className="text-sm text-text">
            <span className="font-medium text-danger-fg">{excluded.length} employee excluded</span> — missing bank details:{' '}
            {excluded.map((e) => e.employeeName).join(', ')}. Add bank details to include them in this run.
          </p>
        </div>
      )}

      <Card className="p-0">
        <div className="divide-y divide-border">
          {included.map((r) => {
            const open = expanded === r.id
            return (
              <div key={r.id}>
                <button
                  onClick={() => setExpanded(open ? null : r.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-hover"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown className={cn('size-4 text-text-muted transition-transform', open && 'rotate-180')} />
                    <span className="text-sm font-medium text-text">{r.employeeName}</span>
                  </span>
                  <span className="tabular text-sm font-medium text-text">{formatCurrency(netPay(r))}</span>
                </button>
                {open && (
                  <dl className="grid gap-2 bg-surface-sunken px-11 py-3 text-sm sm:grid-cols-2">
                    <Row label="Gross salary" value={formatCurrency(r.gross)} />
                    <Row label="Advance deduction" value={`- ${formatCurrency(r.deductions.advances)}`} />
                    <Row label="Other deductions" value={`- ${formatCurrency(r.deductions.other)}`} />
                    <Row label="Net payable" value={formatCurrency(netPay(r))} strong />
                  </dl>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/employees/payroll')}>Cancel</Button>
        <Button size="lg" onClick={() => setConfirming(true)}>Process {included.length} Payslips</Button>
      </div>

      <HighStakesConfirmFlow
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          toast(`Processed by A. Bandara — ${formatCurrency(total)} across ${included.length} employees`)
          setConfirming(false)
          navigate('/employees/payroll')
        }}
        title="Confirm payroll run"
        amount={total}
        confirmLabel="Process Payroll"
        review={
          <div className="rounded-[var(--radius-md)] border border-border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Employees included</span>
              <span className="tabular font-medium text-text">{included.length}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-text-muted">Excluded (missing bank)</span>
              <span className="tabular font-medium text-danger-fg">{excluded.length}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-medium text-text">Total payable</span>
              <span className="tabular font-semibold text-text-heading">{formatCurrency(total)}</span>
            </div>
            <p className="mt-2 text-xs text-text-muted">Generates the bank-ready payment file. This cannot be undone.</p>
          </div>
        }
      />
    </div>
  )
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-1)]', highlight && 'ring-1 ring-primary/20')}>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={cn('tabular mt-1 text-lg font-semibold', highlight ? 'text-primary' : 'text-text-heading')}>{value}</p>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-text-muted">{label}</dt>
      <dd className={cn('tabular', strong ? 'font-semibold text-text-heading' : 'text-text')}>{value}</dd>
    </div>
  )
}
