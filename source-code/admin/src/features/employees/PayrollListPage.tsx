import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, PlayCircle, RefreshCw, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import * as employeesService from '@/services/employees'
import { netPay } from './calc'
import { currentMonth, MONTH_STATUS_TONE, monthOptions, monthStatus, periodOf, readMonth, shiftMonth } from './payroll-month'
import type { PayrollRow } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

/*
  EMP-10 — payroll by month (Payroll-Month-History-Addendum). Opens on the current month;
  `?month=YYYY-MM` shows any earlier one (never a future one), so a link opens the same month.
  Processed months are read-only; the current month can be generated but not processed until it
  ends. Viewing only — how payroll is calculated is unchanged.
*/
export function PayrollListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canProcess = can('payroll', 'edit')

  const today = factoryToday()
  const thisMonth = currentMonth(today)
  const [searchParams, setSearchParams] = useSearchParams()
  const month = readMonth(searchParams.get('month'), thisMonth)
  const period = periodOf(month)
  const prevMonth = shiftMonth(month, -1)
  const setMonth = (m: string) => setSearchParams(m === thisMonth ? {} : { month: m }, { replace: true })

  // every period in one call (dev-scale, shared with the Employee page) — the picker needs them all
  const { data: payroll, isPending, isError, refetch } = useQuery({
    queryKey: ['employees', 'payroll'],
    queryFn: () => employeesService.listPayroll(),
  })

  const generateMutation = useMutation({
    mutationFn: () => employeesService.generatePayroll(period),
    onSuccess: () => {
      toast(`Payroll generated from attendance for ${period}`)
      void queryClient.invalidateQueries({ queryKey: ['employees', 'payroll'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not generate payroll', 'danger'),
  })

  const columns: Column<PayrollRow>[] = [
    { key: 'employeeName', header: 'Employee', render: (r) => <span className="font-medium text-text">{r.employeeName}</span> },
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
    return <ErrorState title="Couldn't load payroll" description="Something went wrong fetching payroll." onRetry={() => void refetch()} />
  }

  const all = payroll ?? []
  const rows = all.filter((r) => r.period === period)
  const prevRows = all.filter((r) => r.period === periodOf(prevMonth))
  const status = monthStatus(rows, month, thisMonth)
  const options = monthOptions(thisMonth, all.map((r) => r.period))
  const earliest = options[options.length - 1].value
  // a Processed month is read-only; the current month can't be processed until it ends
  const canGenerate = canProcess && status !== 'Processed'
  const canRunProcess = canProcess && status === 'Ready to process'

  return (
    <div>
      <PageHeader
        title="Payroll"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Payroll' }]}
        description={`${period} run`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => toast('Bank payment file generated')}>
              <FileSpreadsheet className="size-4" /> Bank File
            </Button>
            {canGenerate && (
              <Button variant="secondary" size="sm" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
                <RefreshCw className="size-4" /> {rows.length ? 'Recalculate from Attendance' : 'Generate from Attendance'}
              </Button>
            )}
            {canRunProcess && (
              <Button size="sm" onClick={() => navigate(`/employees/payroll/process?month=${month}`)}>
                <PlayCircle className="size-4" /> Process Payroll
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Previous month"
            title="Previous month"
            onClick={() => setMonth(prevMonth)}
            disabled={month <= earliest}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Select aria-label="Pay month" value={month} onChange={(e) => setMonth(e.target.value)} options={options} />
          <Button
            variant="secondary"
            size="sm"
            aria-label="Next month"
            title="Next month"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= thisMonth}
          >
            <ChevronRight className="size-4" />
          </Button>
          <StatusBadge tone={MONTH_STATUS_TONE[status]}>{status}</StatusBadge>
        </div>
        <MonthComparison rows={rows} prevRows={prevRows} prevLabel={periodOf(prevMonth)} />
      </div>

      {status === 'In progress' && (
        <p className="mb-4 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-muted">
          Month in progress: figures up to {formatDate(today)}, from the attendance marked so far. They change until the month
          ends; it can be processed after that.
        </p>
      )}
      {status === 'Processed' && (
        <p className="mb-4 text-xs text-text-muted">Processed — this month is read-only.</p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/employees/payroll/${r.id}/payslip`)}
        emptyState={
          <EmptyState
            icon={<FileText className="size-6" strokeWidth={1.5} />}
            title={`No payroll for ${period}`}
            description={canGenerate ? 'Generate it from the attendance marked for this month.' : undefined}
            action={
              canGenerate ? (
                <Button size="sm" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
                  Generate from Attendance
                </Button>
              ) : undefined
            }
          />
        }
        actions={(r) => <RowAction icon={<FileText className="size-4" />} label="View Payslip" onClick={() => navigate(`/employees/payroll/${r.id}/payslip`)} />}
      />
    </div>
  )
}

/** Total net payable and headcount against the month before — so a partial month isn't misread. */
function MonthComparison({ rows, prevRows, prevLabel }: { rows: PayrollRow[]; prevRows: PayrollRow[]; prevLabel: string }) {
  const total = rows.reduce((s, r) => s + netPay(r), 0)
  const prevTotal = prevRows.reduce((s, r) => s + netPay(r), 0)
  return (
    <dl className="flex gap-6 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-text-muted">Net payable</dt>
        <dd className="tabular font-semibold text-text-heading">{formatCurrency(total)}</dd>
        <dd className="tabular text-xs text-text-muted">
          {prevLabel}: {prevRows.length ? formatCurrency(prevTotal) : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-text-muted">Employees</dt>
        <dd className="tabular font-semibold text-text-heading">{rows.length}</dd>
        <dd className="tabular text-xs text-text-muted">
          {prevLabel}: {prevRows.length || '—'}
        </dd>
      </div>
    </dl>
  )
}
