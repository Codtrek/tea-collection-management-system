import { useState } from 'react'
import { Banknote, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportViewer } from './ReportViewer'
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { StatCard } from '@/components/data/StatCard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Select } from '@/components/ui/Select'
import { REVENUE_BY_ESTATE, REVENUE_ROWS, REVENUE_TREND } from './data'
import { formatCurrency, formatPercent } from '@/lib/format'

/* RPT-02 — tea selling income from processed settlements (EST-08) at ADM-01 grade rates. */
export function RevenueReportPage() {
  const [range, setRange] = useState('jul-2026')
  const [estate, setEstate] = useState('')

  type Row = (typeof REVENUE_ROWS)[number]
  const columns: Column<Row>[] = [
    { key: 'estate', header: 'Estate' },
    { key: 'superRs', header: 'Super revenue', align: 'right', render: (r) => formatCurrency(r.superRs) },
    { key: 'normalRs', header: 'Normal revenue', align: 'right', render: (r) => formatCurrency(r.normalRs) },
    { key: 'gross', header: 'Gross (before deductions)', align: 'right', render: (r) => formatCurrency(r.gross) },
  ]

  const rows = REVENUE_ROWS.filter((r) => !estate || r.estate === estate)
  const totalSuper = REVENUE_ROWS.reduce((s, r) => s + r.superRs, 0)
  const totalNormal = REVENUE_ROWS.reduce((s, r) => s + r.normalRs, 0)
  const superPct = Math.round((totalSuper / (totalSuper + totalNormal)) * 100)

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
              value={range}
              onChange={(e) => setRange(e.target.value)}
              options={[
                { value: 'jul-2026', label: 'July 2026' },
                { value: 'jun-2026', label: 'June 2026' },
                { value: 'q2-2026', label: 'Q2 2026' },
              ]}
            />
            <Select
              label="Estate"
              placeholder="All estates"
              value={estate}
              onChange={(e) => setEstate(e.target.value)}
              options={REVENUE_ROWS.map((r) => ({ value: r.estate, label: r.estate }))}
            />
            <Select label="Grade" placeholder="All grades" options={[{ value: 'Super', label: 'Super' }, { value: 'Normal', label: 'Normal' }]} />
          </>
        }
        summary={
          <>
            <StatCard label="Total revenue (July 2026)" value={8412000} format={formatCurrency} icon={<Banknote className="size-4" />} deltaPercent={6.2} note="vs June" />
            <StatCard label="Average per estate" value={2103000} format={formatCurrency} icon={<Building2 className="size-4" />} />
            <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
              <p className="text-[13px] font-medium text-text-muted">Month-over-month change</p>
              <p className="tabular mt-3 text-[34px] font-semibold leading-none tracking-tight text-success-fg">
                {formatPercent(6.2, true)}
              </p>
              <p className="mt-2 text-xs text-text-muted">Rs. 7,921,000 in June → Rs. 8,412,000 in July</p>
            </div>
          </>
        }
        charts={
          <div className="grid gap-4 lg:grid-cols-3">
            <AreaChartCard title="Revenue trend" data={REVENUE_TREND} xKey="month" yKey="revenue" valueFmt={formatCurrency} />
            <DonutChartCard
              title="Revenue by grade"
              centerLabel={`Super ${superPct}%`}
              valueFmt={formatCurrency}
              data={[
                { name: `Super ${superPct}%`, value: totalSuper, color: GRADE_SUPER },
                { name: `Normal ${100 - superPct}%`, value: totalNormal, color: GRADE_NORMAL },
              ]}
            />
            <BarChartCard title="Revenue by estate (July)" data={REVENUE_BY_ESTATE} xKey="estate" yKey="revenue" valueFmt={formatCurrency} />
          </div>
        }
        table={<DataTable columns={columns} rows={rows} rowKey={(r) => r.estate} />}
      />
    </div>
  )
}
