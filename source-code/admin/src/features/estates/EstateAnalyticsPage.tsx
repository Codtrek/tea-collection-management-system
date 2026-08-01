import { useState } from 'react'
import { FileDown, TrendingUp, Scale } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { AreaChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { StatCard } from '@/components/data/StatCard'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ESTATES } from './data'
import { formatCurrency, formatPercent, formatWeight } from '@/lib/format'

/* EST-09 — per-estate revenue & quality analytics vs the factory average. */

const REVENUE_TREND: Record<string, Array<{ month: string; revenue: number }>> = {
  'EST-0001': [
    { month: 'Feb', revenue: 512000 }, { month: 'Mar', revenue: 548000 }, { month: 'Apr', revenue: 601000 },
    { month: 'May', revenue: 574000 }, { month: 'Jun', revenue: 621400 }, { month: 'Jul', revenue: 658900 },
  ],
  'EST-0002': [
    { month: 'Feb', revenue: 388000 }, { month: 'Mar', revenue: 402000 }, { month: 'Apr', revenue: 396000 },
    { month: 'May', revenue: 421000 }, { month: 'Jun', revenue: 437800 }, { month: 'Jul', revenue: 448500 },
  ],
  'EST-0003': [
    { month: 'Feb', revenue: 455000 }, { month: 'Mar', revenue: 471000 }, { month: 'Apr', revenue: 502000 },
    { month: 'May', revenue: 489000 }, { month: 'Jun', revenue: 511600 }, { month: 'Jul', revenue: 530200 },
  ],
  'EST-0004': [
    { month: 'Feb', revenue: 0 }, { month: 'Mar', revenue: 96000 }, { month: 'Apr', revenue: 128000 },
    { month: 'May', revenue: 149000 }, { month: 'Jun', revenue: 171000 }, { month: 'Jul', revenue: 184300 },
  ],
  'EST-0005': [
    { month: 'Feb', revenue: 141000 }, { month: 'Mar', revenue: 122000 }, { month: 'Apr', revenue: 87000 },
    { month: 'May', revenue: 0 }, { month: 'Jun', revenue: 0 }, { month: 'Jul', revenue: 0 },
  ],
}

const GRADE_SPLIT: Record<string, { superPct: number }> = {
  'EST-0001': { superPct: 70 },
  'EST-0002': { superPct: 30 },
  'EST-0003': { superPct: 53 },
  'EST-0004': { superPct: 100 },
  'EST-0005': { superPct: 22 },
}

const FACTORY_AVG_SUPER_PCT = 58
const FACTORY_AVG_MONTHLY_KG = 1690

export function EstateAnalyticsPage() {
  const { toast } = useToast()
  const [estateId, setEstateId] = useState('EST-0001')

  const estate = ESTATES.find((e) => e.id === estateId) ?? ESTATES[0]
  const trend = REVENUE_TREND[estateId] ?? []
  const split = GRADE_SPLIT[estateId] ?? { superPct: 50 }
  const julyRevenue = trend[trend.length - 1]?.revenue ?? 0
  const monthlyKg = Math.round(estate.ytdDeliveriesKg / 7)
  const vsFactory = FACTORY_AVG_MONTHLY_KG ? ((monthlyKg - FACTORY_AVG_MONTHLY_KG) / FACTORY_AVG_MONTHLY_KG) * 100 : 0

  return (
    <div>
      <PageHeader
        title="Revenue & Quality Analytics"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Estate Owners', to: '/estates' }, { label: 'Analytics' }]}
        actions={
          <Button variant="secondary" onClick={() => toast('Analytics exported (demo)')}>
            <FileDown className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-5 max-w-sm">
        <Select
          label="Estate"
          value={estateId}
          onChange={(e) => setEstateId(e.target.value)}
          options={ESTATES.map((e) => ({ value: e.id, label: `${e.estateName} — ${e.ownerName}` }))}
        />
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue (July 2026)" value={julyRevenue} format={formatCurrency} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Avg monthly deliveries" value={monthlyKg} format={formatWeight} icon={<Scale className="size-4" />} />
        <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
          <p className="text-[13px] font-medium text-text-muted">vs factory average</p>
          <p className="tabular mt-3 text-[34px] font-semibold leading-none tracking-tight text-text-heading">
            {formatPercent(vsFactory, true)}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Factory average {formatWeight(FACTORY_AVG_MONTHLY_KG)}/month · Super share {FACTORY_AVG_SUPER_PCT}% factory-wide
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <AreaChartCard
          title={`Revenue trend — ${estate.estateName}`}
          data={trend}
          xKey="month"
          yKey="revenue"
          valueFmt={formatCurrency}
        />
        <DonutChartCard
          title="Grade distribution"
          centerLabel={`Super ${split.superPct}%`}
          valueFmt={(v) => `${v}%`}
          data={[
            { name: `Super ${split.superPct}%`, value: split.superPct, color: GRADE_SUPER },
            { name: `Normal ${100 - split.superPct}%`, value: 100 - split.superPct, color: GRADE_NORMAL },
          ]}
        />
      </div>
    </div>
  )
}
