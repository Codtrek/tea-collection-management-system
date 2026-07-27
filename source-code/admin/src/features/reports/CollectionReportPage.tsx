import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Scale, Trophy, Warehouse } from 'lucide-react'
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
import { REPORT_PERIODS, type CollectionReport } from './types'
import { formatNumber, formatWeight } from '@/lib/format'

function periodLabel(period: string): string {
  return REPORT_PERIODS.find((p) => p.value === period)?.label ?? period
}

/* RPT-01 — aggregated collection volumes; confirmed records only. Computed
   server-side (`GET /reports/collection`) — this page never recomputes the
   arithmetic, same rule Fertilizer's stock position follows. */
export function CollectionReportPage() {
  const [period, setPeriod] = useState<string | undefined>(undefined)
  const [estate, setEstate] = useState('')

  const {
    data: report,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'collection', period ?? 'auto'],
    queryFn: () => reportsService.getCollectionReport(period),
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
        title="Couldn't load the collection report"
        description="Something went wrong fetching collection data."
        onRetry={() => void refetch()}
      />
    )
  }

  type Row = CollectionReport['rows'][number]
  const columns: Column<Row>[] = [
    { key: 'estate', header: 'Estate' },
    { key: 'deliveries', header: 'Deliveries', align: 'right', render: (r) => formatNumber(r.deliveries) },
    { key: 'kg', header: 'Collected', align: 'right', render: (r) => formatWeight(r.kg) },
    { key: 'superPct', header: 'Super share', align: 'right', render: (r) => `${r.superPct}%` },
  ]

  const rows = report.rows.filter((r) => !estate || r.estate === estate)

  return (
    <div>
      <PageHeader
        title="Collection Reports"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Collection' }]}
        description="Confirmed collection records only — provisional entries are excluded."
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
              label={`Total collected (${periodLabel(report.period)})`}
              value={report.totalKg}
              format={formatWeight}
              icon={<Scale className="size-4" />}
            />
            <StatCard label="Average per estate" value={report.avgPerEstate} format={formatWeight} icon={<Warehouse className="size-4" />} />
            <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-text-muted">Top-performing estate (YTD)</span>
                <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-brand-soft text-primary">
                  <Trophy className="size-4" />
                </span>
              </div>
              <p className="text-xl font-semibold text-text-heading">{report.topEstate?.estate ?? '—'}</p>
              <p className="tabular mt-1 text-sm text-text-muted">
                {report.topEstate ? `${formatWeight(report.topEstate.kg)} YTD` : 'No confirmed deliveries yet'}
              </p>
            </div>
          </>
        }
        charts={
          <div className="grid gap-4 lg:grid-cols-3">
            <AreaChartCard title="Collection trend" data={report.trend} xKey="month" yKey="value" valueFmt={formatWeight} className="lg:col-span-1" />
            <BarChartCard title="By estate (YTD)" data={report.byEstate} xKey="estate" yKey="kg" valueFmt={formatWeight} />
            <DonutChartCard
              title={`Grade split (${periodLabel(report.period)})`}
              centerLabel={`Super ${report.gradeSplit.superPct}%`}
              valueFmt={(v) => `${v}%`}
              data={[
                { name: `Super ${report.gradeSplit.superPct}%`, value: report.gradeSplit.superPct, color: GRADE_SUPER },
                { name: `Normal ${report.gradeSplit.normalPct}%`, value: report.gradeSplit.normalPct, color: GRADE_NORMAL },
              ]}
            />
          </div>
        }
        table={
          rows.length === 0 ? (
            <EmptyState title="No confirmed deliveries" description="No estate matched this period and filter combination." />
          ) : (
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.estate} />
          )
        }
      />
    </div>
  )
}
