import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import type { ExpenseTableRow } from './types'
import { formatCurrency, formatDate, formatWeight } from '@/lib/format'

/* RPT-03 — expense breakdown: settlements + payroll + RPT-04 manual entries.
   Payroll/Fertilizer/Transport are DERIVED server-side from payroll_runs/
   settlements at query time; only manual entries are stored rows. */
export function ExpenseReportPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canLog = can('reports', 'edit') // Officer enters daily expenses (§8.1.6); Manager read-only
  const [month, setMonth] = useState<string | undefined>(undefined)
  const [category, setCategory] = useState('')

  const {
    data: report,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'expenses', month ?? 'auto'],
    queryFn: () => reportsService.getExpenseReport({ month, groupBy: 'entry' }),
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

  const columns: Column<ExpenseTableRow>[] = [
    {
      key: 'description',
      header: 'Expense',
      render: (e) => (
        <div>
          <p className="font-medium text-text">{e.description}</p>
          <p className="id text-xs text-text-muted">{e.key}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (e) => <StatusBadge tone="neutral">{e.category}</StatusBadge> },
    { key: 'amount', header: 'Amount', align: 'right', render: (e) => formatCurrency(e.amount) },
    { key: 'date', header: 'Date', render: (e) => (e.date ? formatDate(e.date) : '') },
    {
      key: 'source',
      header: 'Source',
      render: (e) =>
        e.href ? (
          <Link to={e.href} className="text-xs font-medium text-primary hover:underline">
            {e.source} →
          </Link>
        ) : (
          <span className="text-xs text-text-muted">{e.source}</span>
        ),
    },
  ]

  const rows = report.table.rows.filter((e) => !category || e.category === category)

  return (
    <div>
      <PageHeader
        title="Expense Reports"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Expenses' }]}
        description="Green leaf purchases, processed wages, fertilizer stock bought and daily expense entries. Charges recovered from estate owners and advances are not expenses."
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
              label="Month"
              placeholder="Last complete month"
              value={month ?? ''}
              onChange={(e) => setMonth(e.target.value || undefined)}
              options={report.trend.map((t) => ({ value: t.key, label: t.label }))}
            />
            <Select
              label="Category"
              placeholder="All categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={report.options.categories.map((c) => ({ value: c, label: c }))}
            />
            <div aria-hidden />
          </>
        }
        summary={
          <>
            <StatCard
              label={`Total expenses (${report.period.label})`}
              value={report.cards.total.value}
              format={formatCurrency}
              icon={<Receipt className="size-4" />}
              deltaPercent={report.cards.total.changePct ?? undefined}
              note={report.cards.total.changePct !== null ? 'vs prior period' : undefined}
            />
            <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
              <p className="text-[13px] font-medium text-text-muted">Largest category</p>
              {report.cards.largest ? (
                <>
                  <p className="mt-3 text-xl font-semibold text-text-heading">{report.cards.largest.category}</p>
                  <p className="tabular mt-1 text-sm text-text-muted">
                    {formatCurrency(report.cards.largest.amount)} · {Math.round(report.cards.largest.pct)}% of total
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-text-muted">No expenses recorded for this period.</p>
              )}
            </div>
            <StatCard
              label={`Recovered from estate owners (${report.period.label})`}
              value={report.cards.recovered.totalRs}
              format={formatCurrency}
              icon={<TrendingDown className="size-4" />}
              note="Not an expense"
            />
          </>
        }
        charts={
          <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
            <DonutChartCard
              title={`Expense by category (${report.period.label})`}
              centerLabel={formatCurrency(report.cards.total.value)}
              valueFmt={formatCurrency}
              data={report.byCategory.map((s) => ({
                name: `${s.category} ${Math.round(s.pct ?? 0)}%`,
                value: s.amount,
              }))}
            />
            <AreaChartCard title="Expense trend" data={report.trend.map((t) => ({ label: t.label, total: t.total }))} xKey="label" yKey="total" valueFmt={formatCurrency} />
          </div>
        }
        table={
          <>
            {rows.length === 0 ? (
              <EmptyState title="No expenses" description={report.empty.reason ?? 'No expenses matched this filter.'} />
            ) : (
              <DataTable columns={columns} rows={rows} rowKey={(e) => e.key} />
            )}
            {report.stockLost.length > 0 && <StockLostPanel period={report.period.label} lines={report.stockLost} />}
          </>
        }
      />
    </div>
  )
}

/**
 * Fertilizer written off in the period. Shown for information only: the stock's cost was counted
 * when it was bought, so a write-off is never a second expense (and never in the total above).
 */
function StockLostPanel({ period, lines }: { period: string; lines: { item: string; reason: string; kg: number }[] }) {
  return (
    <section className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-text-heading">Stock lost ({period}): information only</h3>
      <p className="mt-0.5 text-xs text-text-muted">
        Fertilizer written off. Not an expense and not in the totals above; its cost was counted when it was bought.
      </p>
      <ul className="mt-3 divide-y divide-border text-sm">
        {lines.map((l) => (
          <li key={`${l.item}-${l.reason}`} className="flex justify-between gap-4 py-1.5">
            <span className="text-text">
              {l.item} <span className="text-text-muted">· {l.reason}</span>
            </span>
            <span className="tabular text-text">{formatWeight(l.kg)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
