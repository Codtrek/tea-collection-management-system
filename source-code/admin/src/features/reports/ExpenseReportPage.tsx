import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Receipt, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import { AreaChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { StatCard } from '@/components/data/StatCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { EXPENSE_ROWS, EXPENSE_SPLIT, EXPENSE_TREND, type ExpenseEntry } from './data'
import { formatCurrency, formatDate } from '@/lib/format'

/* RPT-03 — expense breakdown: settlements + payroll + RPT-04 manual entries. */
export function ExpenseReportPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canLog = can('reports', 'view') // Officer enters daily expenses (§8.1.6)
  const [range, setRange] = useState('jul-2026')
  const [category, setCategory] = useState('')

  const total = EXPENSE_SPLIT.reduce((s, e) => s + e.amount, 0)
  const largest = EXPENSE_SPLIT[0]

  const columns: Column<ExpenseEntry>[] = [
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

  const rows = EXPENSE_ROWS.filter((e) => !category || e.category === category)

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
              value={range}
              onChange={(e) => setRange(e.target.value)}
              options={[
                { value: 'jul-2026', label: 'July 2026' },
                { value: 'jun-2026', label: 'June 2026' },
                { value: 'q2-2026', label: 'Q2 2026' },
              ]}
            />
            <Select
              label="Category"
              placeholder="All categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[...new Set(EXPENSE_ROWS.map((e) => e.category))].map((c) => ({ value: c, label: c }))}
            />
            <div aria-hidden />
          </>
        }
        summary={
          <>
            <StatCard label="Total expenses (July 2026)" value={total} format={formatCurrency} icon={<Receipt className="size-4" />} deltaPercent={2.8} note="vs June" />
            <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
              <p className="text-[13px] font-medium text-text-muted">Largest category</p>
              <p className="mt-3 text-xl font-semibold text-text-heading">{largest.category}</p>
              <p className="tabular mt-1 text-sm text-text-muted">
                {formatCurrency(largest.amount)} · {Math.round((largest.amount / total) * 100)}% of total
              </p>
            </div>
            <StatCard label="Manual entries (July)" value={313575} format={formatCurrency} icon={<TrendingDown className="size-4" />} note="Utilities · Maintenance · Misc" />
          </>
        }
        charts={
          <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
            <DonutChartCard
              title="Expense by category (July 2026)"
              centerLabel={formatCurrency(total)}
              valueFmt={formatCurrency}
              data={EXPENSE_SPLIT.map((e) => ({
                name: `${e.category} ${Math.round((e.amount / total) * 100)}%`,
                value: e.amount,
              }))}
            />
            <AreaChartCard title="Expense trend" data={EXPENSE_TREND} xKey="month" yKey="expenses" valueFmt={formatCurrency} />
          </div>
        }
        table={<DataTable columns={columns} rows={rows} rowKey={(e) => e.id} />}
      />
    </div>
  )
}
