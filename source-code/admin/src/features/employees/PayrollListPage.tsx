import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, PlayCircle, RefreshCw, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MonthPicker } from '@/components/patterns/MonthPicker'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import * as employeesService from '@/services/employees'
import { canProcessMonth, currentMonth, monthOptions, periodOf, READINESS_TONE, readinessLabel } from './payroll-month'
import {
  hasPayrollFilters,
  PAYROLL_ISSUE_OPTIONS,
  PAYROLL_PAGE_SIZE,
  payrollParams,
  payrollQuery,
  readPayrollFilters,
  type PayrollFilters,
} from './payroll-filters'
import type { PayrollIssue, PayrollMonthResult, PayrollViewRow } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

/*
  EMP-10 — payroll by month (Payroll-Month-History-Addendum). Opens on the current month;
  `?month=YYYY-MM` shows any earlier one. Part C: server-side filters and sort in the URL,
  problems (no bank details, Rs. 0 gross) as chips that link to the fix — never as the status —
  and a readiness badge that says "N issues to fix" instead of "Ready to process" while a
  bank-paid employee has no bank details. The summary is always the whole month. Viewing only —
  how payroll is calculated is unchanged.
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
  const filters = readPayrollFilters(searchParams, thisMonth)
  const setFilters = (patch: Partial<PayrollFilters>) =>
    setSearchParams(payrollParams({ ...filters, page: 0, ...patch }, thisMonth), { replace: true })
  const month = filters.month
  const period = periodOf(month)
  const query = payrollQuery(filters)

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['employees', 'payroll', 'month', query],
    queryFn: () => employeesService.getPayrollMonth(query),
    placeholderData: keepPreviousData,
  })

  const generateMutation = useMutation({
    mutationFn: () => employeesService.generatePayroll(period),
    onSuccess: () => {
      toast(`Payroll generated from attendance for ${period}`)
      void queryClient.invalidateQueries({ queryKey: ['employees', 'payroll'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not generate payroll', 'danger'),
  })

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

  const { readiness, summary } = data
  const options = monthOptions(thisMonth, data.periods)
  // a Processed month is read-only; the current month can't be processed until it ends
  const canGenerate = canProcess && readiness.status !== 'Processed'
  const canRunProcess = canProcess && canProcessMonth(readiness)
  const filtered = hasPayrollFilters(filters)

  const sortable = (key: string) => ({ sortable: true, sortValue: () => key })
  const columns: Column<PayrollViewRow>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (r) => (
        <div>
          <p className="font-medium text-text">{r.employeeName}</p>
          <p className="text-xs text-text-muted">
            <span className="id">{r.employeeId}</span> · {r.role}
            {r.routes.length > 0 && ` · ${r.routes.map((x) => x.name).join(', ')}`}
            {r.paymentMethod === 'cash' && ' · paid in cash'}
          </p>
          <ProblemChips row={r} />
        </div>
      ),
    },
    { key: 'gross', header: 'Gross', align: 'right', ...sortable('gross'), render: (r) => formatCurrency(r.gross) },
    { key: 'deductions', header: 'Deductions', align: 'right', ...sortable('deductions'), render: (r) => formatCurrency(r.deductionsTotal) },
    { key: 'net', header: 'Net Payable', align: 'right', ...sortable('net'), render: (r) => <span className="font-medium">{formatCurrency(r.net)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={r.status === 'Processed' ? 'success' : 'warning'}>{r.status}</StatusBadge>
          {r.excludedReason && (
            <span className="text-xs text-text-muted" title={r.excludedReason}>
              Excluded from run
            </span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payroll"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Payroll' }]}
        description={`${period} run`}
        actions={
          <div className="flex flex-wrap gap-2">
            {/* the bank file doesn't exist yet — say so instead of a button that does nothing */}
            <span title="Coming soon — the bank payment file isn't built yet">
              <Button variant="secondary" size="sm" disabled aria-label="Bank File (coming soon)">
                <FileSpreadsheet className="size-4" /> Bank File
              </Button>
            </span>
            {canGenerate && (
              <Button variant="secondary" size="sm" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
                <RefreshCw className="size-4" /> {summary.employees ? 'Recalculate from Attendance' : 'Generate from Attendance'}
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

      {/* wraps below the picker on narrow screens instead of running off the page edge */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <MonthPicker
          month={month}
          options={options}
          onChange={(m) => setFilters({ month: m })}
          ariaLabel="Pay month"
          badge={
            readiness.status === 'Issues to fix' ? (
              <button
                type="button"
                onClick={() => setFilters({ issues: ['noBank'] })}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                title="Show the employees with no bank details"
              >
                <StatusBadge tone={READINESS_TONE[readiness.status]}>
                  <AlertTriangle className="size-3" aria-hidden /> {readinessLabel(readiness)}
                </StatusBadge>
              </button>
            ) : (
              <StatusBadge tone={READINESS_TONE[readiness.status]}>{readinessLabel(readiness)}</StatusBadge>
            )
          }
        />
        <MonthSummary summary={summary} shown={filtered ? data.total : null} />
      </div>

      {readiness.status === 'In progress' && (
        <p className="mb-4 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-muted">
          Month in progress: figures up to {formatDate(today)}, from the attendance marked so far. They change until the month
          ends; it can be processed after that.
        </p>
      )}
      {readiness.status === 'Processed' && (
        <p className="mb-4 text-xs text-text-muted">
          Processed — this month is read-only.
          {readiness.excluded > 0 && ` ${readiness.excluded} employee(s) were excluded with a reason and are still Pending.`}
        </p>
      )}
      {readiness.warnings > 0 && readiness.status !== 'In progress' && (
        <p className="mb-4 text-xs text-text-muted">
          {readiness.warnings} employee(s) have Rs. 0 gross — usually no attendance or no pay rates on record. This doesn't block
          processing.{' '}
          <button className="text-primary hover:underline" onClick={() => setFilters({ issues: ['zeroGross'] })}>
            Show them
          </button>
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_150px_150px_190px_150px]">
        <Input aria-label="Search payroll" placeholder="Search employee name or EMP- ID…" value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} />
        <Select aria-label="Role" placeholder="All roles" value={filters.role} onChange={(e) => setFilters({ role: e.target.value })} options={data.roles.map((r) => ({ value: r, label: r }))} />
        <Select
          aria-label="Route (collection agents)"
          placeholder="All routes"
          value={filters.route}
          onChange={(e) => setFilters({ route: e.target.value })}
          options={data.routes.map((r) => ({ value: String(r.id), label: r.name }))}
        />
        <Select
          aria-label="Payroll status"
          placeholder="All statuses"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          options={[
            { value: 'Pending', label: 'Pending' },
            { value: 'Processed', label: 'Processed' },
          ]}
        />
        <Select
          aria-label="Issues"
          placeholder="Any issues"
          value={filters.issues.length === 1 ? filters.issues[0] : ''}
          onChange={(e) => setFilters({ issues: e.target.value ? [e.target.value as PayrollIssue] : [] })}
          options={PAYROLL_ISSUE_OPTIONS}
        />
        <Select
          aria-label="Payment method"
          placeholder="Bank and cash"
          value={filters.method}
          onChange={(e) => setFilters({ method: e.target.value })}
          options={[
            { value: 'bank', label: 'Bank' },
            { value: 'cash', label: 'Cash' },
          ]}
        />
      </div>

      {filtered && (
        <p className="mb-2 flex items-center gap-2 text-xs text-text-muted">
          Showing {data.total} of {summary.employees} employees ·{' '}
          <button
            className="text-primary hover:underline"
            onClick={() => setFilters({ search: '', role: '', route: '', status: '', issues: [], method: '' })}
          >
            Clear filters
          </button>
          {isFetching && <Loader2 className="size-3.5 animate-spin" aria-label="Updating" />}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={data.rows}
        rowKey={(r) => r.id}
        valign="top"
        onRowClick={(r) => navigate(`/employees/payroll/${r.id}/payslip`)}
        serverPage={{
          page: data.page,
          pageSize: PAYROLL_PAGE_SIZE,
          total: data.total,
          onPageChange: (p) => setSearchParams(payrollParams({ ...filters, page: p }, thisMonth), { replace: true }),
        }}
        serverSort={{
          key: filters.dir ? filters.sort : '',
          direction: filters.dir || null,
          onSortChange: (key, direction) => setFilters({ sort: direction ? key : '', dir: direction ?? '' }),
        }}
        emptyState={
          filtered ? (
            <EmptyState icon={<FileText className="size-6" strokeWidth={1.5} />} title="No employees match these filters" />
          ) : (
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
          )
        }
        actions={(r) => <RowAction icon={<FileText className="size-4" />} label="View Payslip" onClick={() => navigate(`/employees/payroll/${r.id}/payslip`)} />}
      />
    </div>
  )
}

/** Data problems — each links to where it's fixed. Never the payroll status. */
function ProblemChips({ row }: { row: PayrollViewRow }) {
  if (!row.problems.noBank && !row.problems.zeroGross) return null
  const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium hover:underline'
  return (
    <div className="mt-1 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {row.problems.noBank && (
        <Link to={`/employees/${row.employeeId}/edit#bank`} className={`${chip} bg-danger-bg text-danger-fg`}>
          <AlertTriangle className="size-3" aria-hidden /> No bank details
        </Link>
      )}
      {row.problems.zeroGross && (
        <Link to={`/employees/${row.employeeId}?tab=attendance`} className={`${chip} bg-warning-bg text-warning-fg`}>
          Rs. 0 gross
        </Link>
      )}
    </div>
  )
}

/** The whole month's net payable and headcount against the month before — "Showing X of Y" when filtered. */
function MonthSummary({ summary, shown }: { summary: PayrollMonthResult['summary']; shown: number | null }) {
  const { prev } = summary
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-text-muted">Net payable</dt>
        <dd className="tabular font-semibold text-text-heading">{formatCurrency(summary.net)}</dd>
        <dd className="tabular text-xs text-text-muted">
          {prev.period}: {prev.employees ? formatCurrency(prev.net) : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-text-muted">Employees</dt>
        <dd className="tabular font-semibold text-text-heading">
          {shown !== null ? `Showing ${shown} of ${summary.employees}` : summary.employees}
        </dd>
        <dd className="tabular text-xs text-text-muted">
          {prev.period}: {prev.employees || '—'}
        </dd>
      </div>
    </dl>
  )
}
