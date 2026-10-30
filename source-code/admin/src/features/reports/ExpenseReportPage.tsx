import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Receipt, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import { AreaChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { StatCard } from '@/components/data/StatCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import * as reportsService from '@/services/reports'
import { REPORT_PERIODS, type ExpenseRow } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

function periodLabel(period: string): string {
  return REPORT_PERIODS.find((p) => p.value === period)?.label ?? period
}

/* RPT-03 — expense breakdown: settlements + payroll + RPT-04 manual entries.
   Payroll/Fertilizer/Transport are DERIVED server-side from payroll_runs/
   settlements at query time; only manual entries are stored rows. */
export function ExpenseReportPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canLog = can('reports', 'edit') // Officer enters daily expenses (§8.1.6); Manager read-only
  const [period, setPeriod] = useState<string | undefined>(undefined)
  const [category, setCategory] = useState('')

  const {
    data: report,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'expenses', period ?? 'auto'],
    queryFn: () => reportsService.getExpenseReport(period),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !report) {
    return (
      <ErrorState
        title="Couldn't load the expense report"
        description="Something went wrong fetching expense data."
        onRetry={() => void refetch()}
      />
    )
  }

  const columns: Column<ExpenseRow>[] = [
    {
      key: 'description',
      header: 'Expense',
      render: (e) => (
        <div>
          <p className="font-medium text-text">{e.description}</p>
          <p className="id text-xs text-text-muted">{e.id}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (e) => <StatusBadge tone="neutral">{e.category}</StatusBadge> },
    { key: 'amount', header: 'Amount', align: 'right', render: (e) => formatCurrency(e.amount) },
    { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
    { key: 'source', header: 'Source', render: (e) => <span className="text-xs text-text-muted">{e.source}</span> },
  ]

  const rows = report.rows.filter((e) => !category || e.category === category)

  return (
    <div>
      <PageHeader
        title="Expense Reports"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Expenses' }]}
        description="Transport and fertilizer from settlements, payroll from EMP-12, plus daily expense entries."
        actions={
          canLog ? (
            <Button onClick={() => navigate('/reports/expenses/new')}>
              <Plus className="size-4" /> Log Daily Expense
            </Button>
          ) : undefined
        }
      />

      <ReportViewer
        filters={
          <>
            <Select
              label="Period"
              placeholder="Latest with data"
              value={period ?? ''}
              onChange={(e) => setPeriod(e.target.value || undefined)}
              options={REPORT_PERIODS}
            />
            <Select
              label="Category"
              placeholder="All categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[...new Set(report.rows.map((e) => e.category))].map((c) => ({ value: c, label: c }))}
            />
            <div aria-hidden />
          </>
        }
        summary={
          <>
            <StatCard
              label={`Total expenses (${periodLabel(report.period)})`}
              value={report.total}
              format={formatCurrency}
              icon={<Receipt className="size-4" />}
              deltaPercent={report.deltaPercent ?? undefined}
              note={report.deltaPercent !== null ? 'vs prior period' : undefined}
            />
            <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
              <p className="text-[13px] font-medium text-text-muted">Largest category</p>
              {report.largest ? (
                <>
                  <p className="mt-3 text-xl font-semibold text-text-heading">{report.largest.category}</p>
                  <p className="tabular mt-1 text-sm text-text-muted">
                    {formatCurrency(report.largest.amount)} · {report.total ? Math.round((report.largest.amount / report.total) * 100) : 0}% of total
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-text-muted">No expenses recorded for this period.</p>
              )}
            </div>
            <StatCard
              label={`Manual entries (${periodLabel(report.period)})`}
              value={report.manualTotal}
              format={formatCurrency}
              icon={<TrendingDown className="size-4" />}
              note="Utilities · Maintenance · Misc"
            />
          </>
        }
        charts={
          <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
            <DonutChartCard
              title={`Expense by category (${periodLabel(report.period)})`}
              centerLabel={formatCurrency(report.total)}
              valueFmt={formatCurrency}
              data={report.split.map((s) => ({
                name: `${s.category} ${report.total ? Math.round((s.amount / report.total) * 100) : 0}%`,
                value: s.amount,
              }))}
            />
            <AreaChartCard title="Expense trend" data={report.trend} xKey="month" yKey="value" valueFmt={formatCurrency} />
          </div>
        }
        table={
          rows.length === 0 ? (
            <EmptyState title="No expenses" description="No expenses matched this period and filter combination." />
          ) : (
            <DataTable columns={columns} rows={rows} rowKey={(e) => e.id} />
          )
        }
      />
    </div>
  )
}
