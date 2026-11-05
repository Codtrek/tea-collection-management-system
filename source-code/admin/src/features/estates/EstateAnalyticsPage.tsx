import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown, Loader2, TrendingUp, Scale } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { AreaChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { StatCard } from '@/components/data/StatCard'
import { ErrorState } from '@/components/data/ErrorState'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import * as estatesService from '@/services/estates'
import { formatCurrency, formatPercent, formatWeight } from '@/lib/format'

/*
  EST-09 — per-estate revenue & quality analytics vs the factory average, now
  server-computed (GET /estates/:id/analytics) instead of the old hardcoded
  REVENUE_TREND/GRADE_SPLIT/FACTORY_AVG_* constants. `EstateAnalyticsBody` is
  the reusable chart body — EstateDetailPage's Analytics tab (addendum §9)
  renders it pre-scoped to the current owner, no estate picker, same
  component, no duplication.
*/

export function EstateAnalyticsBody({ estateId }: { estateId: string }) {
  const { data: analytics, isPending, isError, refetch } = useQuery({
    queryKey: ['estates', estateId, 'analytics'],
    queryFn: () => estatesService.getEstateAnalytics(estateId),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !analytics) {
    return <ErrorState title="Couldn't load analytics" onRetry={() => void refetch()} />
  }

  const latestRevenue = analytics.revenueTrend[analytics.revenueTrend.length - 1]?.revenue ?? 0

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue (latest period)" value={latestRevenue} format={formatCurrency} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Avg monthly deliveries" value={analytics.avgMonthlyKg} format={formatWeight} icon={<Scale className="size-4" />} />
        <div className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)]">
          <p className="text-[13px] font-medium text-text-muted">vs factory average</p>
          <p className="tabular mt-3 text-[34px] font-semibold leading-none tracking-tight text-text-heading">
            {analytics.deliveredVsAvgPct === null ? '—' : formatPercent(analytics.deliveredVsAvgPct, true)}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Factory average {formatWeight(analytics.factoryAvgMonthlyKg)}/month · Super share {analytics.factoryAvgSuperPct}%
            factory-wide
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <AreaChartCard
          title={`Revenue trend — ${analytics.estateName}`}
          data={analytics.revenueTrend}
          xKey="month"
          yKey="revenue"
          valueFmt={formatCurrency}
        />
        <DonutChartCard
          title="Grade distribution"
          centerLabel={`Super ${analytics.gradeSplit.superPct}%`}
          valueFmt={(v) => `${v}%`}
          data={[
            { name: `Super ${analytics.gradeSplit.superPct}%`, value: analytics.gradeSplit.superPct, color: GRADE_SUPER },
            { name: `Normal ${100 - analytics.gradeSplit.superPct}%`, value: 100 - analytics.gradeSplit.superPct, color: GRADE_NORMAL },
          ]}
        />
      </div>
    </>
  )
}

export function EstateAnalyticsPage() {
  const { toast } = useToast()
  const [estateId, setEstateId] = useState<string | undefined>(undefined)

  const { data: estates } = useQuery({ queryKey: ['estates'], queryFn: estatesService.list })
  const selected = estateId ?? estates?.[0]?.id

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
          value={selected ?? ''}
          onChange={(e) => setEstateId(e.target.value)}
          options={(estates ?? []).map((e) => ({ value: e.id, label: `${e.estateName} — ${e.ownerName}` }))}
        />
      </div>

      {selected ? <EstateAnalyticsBody estateId={selected} /> : null}
    </div>
  )
}
