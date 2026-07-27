import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Banknote, Building2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { StatCard } from '@/components/data/StatCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { Select } from '@/components/ui/Select'
import * as reportsService from '@/services/reports'
import { REPORT_PERIODS, type RevenueReport } from './types'
import { formatCurrency, formatPercent } from '@/lib/format'

function periodLabel(period: string): string {
  return REPORT_PERIODS.find((p) => p.value === period)?.label ?? period
}

/* RPT-02 — tea selling income from processed settlements (EST-08) at ADM-01 grade
   rates. Only PROCESSED settlements count as realized revenue — a Pending run
   isn't income yet, so a period with nothing processed shows zero, not an error. */
export function RevenueReportPage() {
  const [period, setPeriod] = useState<string | undefined>(undefined)
  const [estate, setEstate] = useState('')

  const {
    data: report,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'revenue', period ?? 'auto'],
    queryFn: () => reportsService.getRevenueReport(period),
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
        title="Couldn't load the revenue report"
        description="Something went wrong fetching settlement data."
        onRetry={() => void refetch()}
      />
    )
  }

  type Row = RevenueReport['rows'][number]
  const columns: Column<Row>[] = [
    { key: 'estate', header: 'Estate' },
    { key: 'superRs', header: 'Super revenue', align: 'right', render: (r) => formatCurrency(r.superRs) },
    { key: 'normalRs', header: 'Normal revenue', align: 'right', render: (r) => formatCurrency(r.normalRs) },
    { key: 'gross', header: 'Gross (before deductions)', align: 'right', render: (r) => formatCurrency(r.gross) },
  ]

  const rows = report.rows.filter((r) => !estate || r.estate === estate)
  const superTotal = rows.reduce((s, r) => s + r.superRs, 0)
  const normalTotal = rows.reduce((s, r) => s + r.normalRs, 0)
  const gradedTotal = superTotal + normalTotal
  const superPct = gradedTotal ? Math.round((superTotal / gradedTotal) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Revenue Reports"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Revenue' }]}
        description="Aggregated from processed payment settlements and Factory Setup grade rates."
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
              label="Estate"
              placeholder="All estates"
              value={estate}
              onChange={(e) => setEstate(e.target.value)}
              options={report.rows.map((r) => ({ value: r.estate, label: r.estate }))}
            />
            <div aria-hidden />
          </>
        }
        summary={
          <>
            <StatCard
              label={`Total revenue (${periodLabel(report.period)})`}
              value={report.totalRevenue}
              format={formatCurrency}
              icon={<Banknote className="size-4" />}
              deltaPercent={report.deltaPercent ?? undefined}
              note={report.prevRevenue !== null ? 'vs prior processed month' : undefined}
            />
            <StatCard label="Average per estate" value={report.avgPerEstate} format={formatCurrency} icon={<Building2 className="size-4" />} />
            <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
              <p className="text-[13px] font-medium text-text-muted">Month-over-month change</p>
              {report.deltaPercent !== null ? (
                <>
                  <p
                    className={`tabular mt-3 text-[34px] font-semibold leading-none tracking-tight ${
                      report.deltaPercent >= 0 ? 'text-success-fg' : 'text-danger-fg'
                    }`}
                  >
                    {formatPercent(report.deltaPercent, true)}
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    {formatCurrency(report.prevRevenue ?? 0)} prior → {formatCurrency(report.totalRevenue)} this period
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-text-muted">No prior processed period to compare against.</p>
              )}
            </div>
          </>
        }
        charts={
          <div className="grid gap-4 lg:grid-cols-3">
            <AreaChartCard title="Revenue trend" data={report.trend} xKey="month" yKey="value" valueFmt={formatCurrency} />
            <DonutChartCard
              title="Revenue by grade"
              centerLabel={`Super ${superPct}%`}
              valueFmt={formatCurrency}
              data={[
                { name: `Super ${superPct}%`, value: superTotal, color: GRADE_SUPER },
                { name: `Normal ${100 - superPct}%`, value: normalTotal, color: GRADE_NORMAL },
              ]}
            />
            <BarChartCard title={`Revenue by estate (${periodLabel(report.period)})`} data={report.byEstate} xKey="estate" yKey="revenue" valueFmt={formatCurrency} />
          </div>
        }
        table={
          rows.length === 0 ? (
            <EmptyState title="No processed revenue" description="No settlements have been processed for this period yet." />
          ) : (
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.estate} />
          )
        }
      />
    </div>
  )
}
