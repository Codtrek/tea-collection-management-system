import { useState } from 'react'
import { Scale, Trophy, Warehouse } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from '../components/ReportViewer'
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { StatCard } from '@/components/data/StatCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Select } from '@/components/ui/Select'
import { COLLECTION_BY_ESTATE, COLLECTION_ROWS, COLLECTION_TREND, GRADE_SPLIT } from '../components/data'
import { formatNumber, formatWeight } from '@/lib/format'

/* RPT-01 — aggregated collection volumes; confirmed records only. */
export function CollectionReportPage() {
  const [range, setRange] = useState('jul-2026')
  const [estate, setEstate] = useState('')
  const [grade, setGrade] = useState('')

  type Row = (typeof COLLECTION_ROWS)[number]
  const columns: Column<Row>[] = [
    { key: 'estate', header: 'Estate' },
    { key: 'deliveries', header: 'Deliveries', align: 'right', render: (r) => formatNumber(r.deliveries) },
    { key: 'kg', header: 'Collected', align: 'right', render: (r) => formatWeight(r.kg) },
    { key: 'superPct', header: 'Super share', align: 'right', render: (r) => `${r.superPct}%` },
  ]

  const rows = COLLECTION_ROWS.filter((r) => !estate || r.estate === estate)
  const topEstate = COLLECTION_BY_ESTATE[0]

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
              value={range}
              onChange={(e) => setRange(e.target.value)}
              options={[
                { value: 'jul-2026', label: 'July 2026' },
                { value: 'jun-2026', label: 'June 2026' },
                { value: 'q2-2026', label: 'Q2 2026' },
              ]}
            />
            <Select
              label="Estate / route"
              placeholder="All estates"
              value={estate}
              onChange={(e) => setEstate(e.target.value)}
              options={COLLECTION_ROWS.map((r) => ({ value: r.estate, label: r.estate }))}
            />
            <Select
              label="Grade"
              placeholder="All grades"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              options={[
                { value: 'Super', label: 'Super' },
                { value: 'Normal', label: 'Normal' },
              ]}
            />
          </>
        }
        summary={
          <>
            <StatCard label="Total collected (July 2026)" value={142350} format={formatWeight} icon={<Scale className="size-4" />} deltaPercent={4.3} note="vs June" />
            <StatCard label="Average per estate" value={35588} format={formatWeight} icon={<Warehouse className="size-4" />} />
            <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-text-muted">Top-performing estate</span>
                <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-brand-soft text-primary">
                  <Trophy className="size-4" />
                </span>
              </div>
              <p className="text-xl font-semibold text-text-heading">{topEstate.estate} Estate</p>
              <p className="tabular mt-1 text-sm text-text-muted">{formatWeight(topEstate.kg)} YTD</p>
            </div>
          </>
        }
        charts={
          <div className="grid gap-4 lg:grid-cols-3">
            <AreaChartCard title="Collection trend" data={COLLECTION_TREND} xKey="month" yKey="kg" valueFmt={formatWeight} className="lg:col-span-1" />
            <BarChartCard title="By estate (YTD)" data={COLLECTION_BY_ESTATE} xKey="estate" yKey="kg" valueFmt={formatWeight} />
            <DonutChartCard
              title="Grade split (July 2026)"
              centerLabel={`Super ${GRADE_SPLIT.superPct}%`}
              valueFmt={(v) => `${v}%`}
              data={[
                { name: `Super ${GRADE_SPLIT.superPct}%`, value: GRADE_SPLIT.superPct, color: GRADE_SUPER },
                { name: `Normal ${GRADE_SPLIT.normalPct}%`, value: GRADE_SPLIT.normalPct, color: GRADE_NORMAL },
              ]}
            />
          </div>
        }
        table={<DataTable columns={columns} rows={rows} rowKey={(r) => r.estate} />}
      />
    </div>
  )
}
