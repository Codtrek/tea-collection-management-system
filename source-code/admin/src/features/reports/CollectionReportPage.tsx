import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layers, Loader2, Scale, Truck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { StatCard } from '@/components/data/StatCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { MonthPicker } from '@/components/patterns/MonthPicker'
import * as reportsService from '@/services/reports'
import { currentMonth, isMonth, monthOptionsFor } from '@/lib/month'
import type { CollectionGroupRow } from './types'
import { formatNumber, formatWeight } from '@/lib/format'

/* RPT-01 — how much leaf came in, from where, of what quality (Reports-Collection-Addendum).
   Every figure comes from `GET /reports/collection`; this page never recomputes one. */
export function CollectionReportPage() {
  const [params, setParams] = useSearchParams()
  const month = isMonth(params.get('month')) ? params.get('month')! : undefined

  const {
    data: report,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'collection', month ?? 'default'],
    queryFn: () => reportsService.getCollectionReport({ month }),
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

  const thisMonth = currentMonth(report.today)
  const options = monthOptionsFor(thisMonth, report.monthsWithData).map((o) =>
    o.value === thisMonth ? { ...o, label: `${o.label} so far` } : o,
  )
  const { cards } = report

  const columns: Column<CollectionGroupRow>[] = [
    {
      key: 'name',
      header: 'Estate',
      render: (r) => (
        <div>
          <p className="font-medium text-text">{r.name}</p>
          {r.routeName && <p className="text-xs text-text-muted">{r.routeName}</p>}
        </div>
      ),
    },
    { key: 'deliveries', header: 'Graded deliveries', align: 'right', render: (r) => formatNumber(r.deliveries) },
    { key: 'estateKg', header: 'Estate kg', align: 'right', render: (r) => (r.estateKg === null ? '—' : formatWeight(r.estateKg)) },
    { key: 'factoryKg', header: 'Factory kg', align: 'right', render: (r) => formatWeight(r.factoryKg) },
    {
      key: 'ungraded',
      header: 'Ungraded',
      align: 'right',
      render: (r) => (r.ungradedDeliveries ? `${r.ungradedDeliveries} · ${formatWeight(r.ungradedEstateKg)}` : '—'),
    },
    { key: 'superShare', header: 'Super share', align: 'right', render: (r) => (r.superShare === null ? '—' : `${r.superShare}%`) },
  ]

  return (
    <div>
      <PageHeader
        title="Collection Reports"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Collection' }]}
        description="Delivered leaf (collected or confirmed). Weights are factory weights — the sum of the grade lines — for graded deliveries; ungraded deliveries and provisional entries are counted separately."
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
            <StatCard
              label={`Factory weight — ${report.period.label}`}
              value={cards.factoryKg.value}
              format={formatWeight}
              icon={<Scale className="size-4" />}
            />
            <StatCard
              label="Graded deliveries"
              value={cards.deliveries.value}
              format={formatNumber}
              icon={<Truck className="size-4" />}
              note={`${cards.deliveries.ungraded} ungraded (${formatWeight(cards.deliveries.ungradedEstateKg)} estate) · ${cards.deliveries.provisional} provisional`}
            />
            <StatCard
              label="Super share"
              value={cards.superShare.value ?? 0}
              format={(v) => (cards.superShare.value === null ? '—' : `${v.toFixed(1)}%`)}
              icon={<Layers className="size-4" />}
            />
          </>
        }
        charts={
          <div className="grid gap-4 lg:grid-cols-3">
            <AreaChartCard title="Collection trend" data={report.trend.points.map((p) => ({ label: p.label, kg: p.kg }))} xKey="label" yKey="kg" valueFmt={formatWeight} />
            <BarChartCard title="Top estates" data={report.topEstates.map((e) => ({ name: e.name, kg: e.kg }))} xKey="name" yKey="kg" valueFmt={formatWeight} />
            <DonutChartCard
              title={`Grade split — ${report.period.label}`}
              centerLabel={cards.superShare.value === null ? '—' : `Super ${cards.superShare.value}%`}
              valueFmt={formatWeight}
              data={[
                { name: 'Super', value: report.gradeSplit.superKg, color: GRADE_SUPER },
                { name: 'Normal', value: report.gradeSplit.normalKg, color: GRADE_NORMAL },
              ]}
            />
          </div>
        }
        table={
          report.table.rows.length === 0 ? (
            <EmptyState title="No deliveries" description="No leaf was delivered in this period." />
          ) : (
            <DataTable columns={columns} rows={report.table.rows} rowKey={(r) => r.key} />
          )
        }
      />
    </div>
  )
}
