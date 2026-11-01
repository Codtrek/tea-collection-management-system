import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, AlertTriangle, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { HighStakesConfirmFlow } from '@/components/patterns/HighStakesConfirmFlow'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as employeesService from '@/services/employees'
import { netPay } from './calc'
import { currentMonth, periodOf, readMonth } from './payroll-month'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

/* EMP-12 — first build of HighStakesConfirmFlow. Employees missing bank details
   are excluded and flagged (UC-054 exception flow); confirmation requires the
   user to re-type the total before the irreversible run. No per-transaction
   bank charge is deducted — resolved 2026-07-26, see Claude.md.
   Runs for `?month=YYYY-MM` (Payroll-Month-History-Addendum): never the month in progress. */
export function PayrollProcessingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [excludeReason, setExcludeReason] = useState('')

  const [searchParams] = useSearchParams()
  const thisMonth = currentMonth()
  const month = readMonth(searchParams.get('month'), thisMonth)
  const PERIOD = periodOf(month)
  const backHref = `/employees/payroll?month=${month}`

  // live problems from the server (payroll-view.ts) — the same check processing enforces
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['employees', 'payroll', 'month', { month, status: 'Pending', limit: 0 }],
    queryFn: () => employeesService.getPayrollMonth({ month, status: 'Pending', limit: 0 }),
  })
  const payroll = data?.rows

  const processMutation = useMutation({
    mutationFn: () =>
      employeesService.processPayroll(
        PERIOD,
        excluded.map((r) => ({ employeeId: r.employeeId, reason: excludeReason.trim() })),
      ),
    onSuccess: (processed) => {
      const total = processed.reduce((sum, r) => sum + netPay(r), 0)
      toast(
        `Processed by ${user?.name ?? 'you'} — ${formatCurrency(total)} across ${processed.length} employees` +
          (excluded.length ? `; ${excluded.length} excluded` : ''),
      )
      setConfirming(false)
      void queryClient.invalidateQueries({ queryKey: ['employees', 'payroll'] })
      navigate(backHref)
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not process payroll', 'danger'),
  })

  const rows = payroll ?? []
  // bank-paid with no bank details: they block the run unless excluded with a reason
  const included = rows.filter((r) => !r.problems.noBank)
  const excluded = rows.filter((r) => r.problems.noBank)
  const total = included.reduce((sum, r) => sum + netPay(r), 0)
  const needsReason = excluded.length > 0 && !excludeReason.trim()

  // the month in progress, or one with nothing pending (processed / never generated), can't be run
  const blocked =
    month === thisMonth
      ? `${PERIOD} is still in progress — it can be processed once the month has ended.`
      : payroll && payroll.length === 0
        ? `Nothing to process for ${PERIOD} — it is already processed or has no payroll yet.`
        : null

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


  const header = (
    <PageHeader
      title="Process Payroll"
      breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Payroll', to: backHref }, { label: 'Process' }]}
    />
  )

  if (blocked) {
    return (
      <div>
        {header}
        <EmptyState
          title={`Can’t process ${PERIOD}`}
          description={blocked}
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate(backHref)}>
              Back to payroll
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      {header}

      {/* Period header */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Pay period" value={PERIOD} />
        <SummaryTile label="Employees" value={`${included.length} included`} />
        <SummaryTile label="Total payable" value={formatCurrency(total)} highlight />
      </div>

      {excluded.length > 0 && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-danger-fg/20 bg-danger-bg/60 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-fg" />
            <div className="text-sm text-text">
              <p>
                <span className="font-medium text-danger-fg">
                  {excluded.length} employee{excluded.length === 1 ? '' : 's'} paid by bank with no bank details
                </span>{' '}
                — they can't be paid in this run. Add their bank details, or exclude them with a reason (recorded in the audit
                log; their payroll stays Pending for a later run).
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {excluded.map((e) => (
                  <li key={e.id}>
                    <Link to={`/employees/${e.employeeId}/edit#bank`} className="text-primary hover:underline">
                      {e.employeeName}
                    </Link>
                    <span className="tabular text-text-muted"> · {formatCurrency(netPay(e))}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 max-w-xl">
            <Input
              label={`Reason for excluding ${excluded.length === 1 ? 'them' : 'these employees'} (required)`}
              value={excludeReason}
              onChange={(e) => setExcludeReason(e.target.value)}
              maxLength={300}
              placeholder="e.g. Bank details requested, not yet received"
            />
          </div>
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
        <Button variant="secondary" onClick={() => navigate(backHref)}>Cancel</Button>
        <Button
          size="lg"
          onClick={() => setConfirming(true)}
          disabled={needsReason || (included.length === 0 && excluded.length === 0)}
          title={needsReason ? 'Give a reason for excluding the employees with no bank details' : undefined}
        >
          Process {included.length} Payslips
        </Button>
      </div>

      <HighStakesConfirmFlow
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => processMutation.mutate()}
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
              <span className="text-text-muted">Excluded (no bank details)</span>
              <span className="tabular font-medium text-danger-fg">{excluded.length}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-medium text-text">Total payable</span>
              <span className="tabular font-semibold text-text-heading">{formatCurrency(total)}</span>
            </div>
            {excluded.length > 0 && <p className="mt-2 text-xs text-text-muted">Reason for exclusions: {excludeReason.trim()}</p>}
            <p className="mt-2 text-xs text-text-muted">Marks these payslips Processed and recovers their advances. This cannot be undone.</p>
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
