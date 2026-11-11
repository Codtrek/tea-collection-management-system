import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Banknote, Loader2, Scale } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import { StatCard } from '@/components/data/StatCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { MonthPicker } from '@/components/patterns/MonthPicker'
import * as reportsService from '@/services/reports'
import { currentMonth, isMonth, monthOptionsFor } from '@/lib/month'
import type { LeafGroupRow } from './types'
import { formatCurrency, formatKg } from '@/lib/format'

/* RPT-02 Leaf Purchase — what the factory owes and pays estate owners for green leaf (Reports
   addendum §9). Every figure comes from `GET /reports/leaf-purchases`; the page recomputes none. */
export function LeafPurchaseReportPage() {
  const [params, setParams] = useSearchParams()
  const month = isMonth(params.get('month')) ? params.get('month')! : undefined
  const { data: report, isPending, isError, refetch } = useQuery({
    queryKey: ['reports', 'leaf-purchases', month ?? 'default'],
    queryFn: () => reportsService.getLeafPurchaseReport({ month }),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError || !report) {
    return <ErrorState title="Couldn't load the leaf purchase report" onRetry={() => void refetch()} />
  }

  const thisMonth = currentMonth(report.today)
  const options = monthOptionsFor(thisMonth, report.monthsWithData).map((o) =>
    o.value === thisMonth ? { ...o, label: `${o.label} so far` } : o,
  )
  const columns: Column<LeafGroupRow>[] = [
    { key: 'name', header: 'Estate', render: (r) => r.name },
    { key: 'factoryKg', header: 'Factory kg', align: 'right', render: (r) => formatKg(r.factoryKg) },
    { key: 'valueRs', header: 'Leaf value', align: 'right', render: (r) => formatCurrency(r.valueRs) },
    { key: 'unsettledRs', header: 'Not yet settled', align: 'right', render: (r) => formatCurrency(r.unsettledRs) },
  ]

  return (
    <div>
      <PageHeader
        title="Leaf Purchase Report"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Leaf purchases' }]}
        description="What the factory owes and pays estate owners for green leaf."
      />
      <ReportViewer
        filters={
          <MonthPicker
            month={report.period.month ?? thisMonth}
            options={options}
            ariaLabel="Report month"
            onChange={(m) => setParams(m ? { month: m } : {}, { replace: true })}
          />
        }
        summary={
          <>
            <StatCard label={`Leaf value — ${report.period.label}`} value={report.cards.leafValue.value} format={formatCurrency} icon={<Banknote className="size-4" />} />
            <StatCard label="Factory kg" value={report.table.totals.factoryKg} format={formatKg} icon={<Scale className="size-4" />} />
            <StatCard label="Not yet settled" value={report.cards.settlement.unsettledRs} format={formatCurrency} icon={<Banknote className="size-4" />} />
          </>
        }
        charts={null}
        table={
          report.table.rows.length === 0 ? (
            <EmptyState title="No graded deliveries" description="No graded leaf in this period." />
          ) : (
            <DataTable columns={columns} rows={report.table.rows} rowKey={(r) => r.key} />
          )
        }
      />
    </div>
  )
}
