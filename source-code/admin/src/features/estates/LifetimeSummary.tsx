import { OutstandingPanel } from './OutstandingPanel'
import type { EstateLifetimeMetrics } from './types'
import { formatCompact, formatCompactCurrency, formatCurrency, formatPercent, formatTenure, formatWeight } from '@/lib/format'

/*
  Addendum §4 — the Lifetime Summary strip. Sits above the rest of Overview;
  this is the answer to "how has this relationship gone, and where does it
  stand today", before anyone clicks a single tab. All figures come from the
  §3 shared selector (useEstateLifetimeMetrics-equivalent) — this component
  never sums a table itself.
*/

export function LifetimeSummary({ metrics }: { metrics: EstateLifetimeMetrics }) {
  const { lifetime, comparison } = metrics
  const memberSinceLabel = new Date(metrics.memberSince).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      {/* Tenure as an eyebrow, not a stat (§6.2) — context that frames every figure below it. */}
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
        Member since {memberSinceLabel} · {formatTenure(metrics.tenureMonths)}
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        <div>
          <p className="text-[13px] text-text-muted">Lifetime delivered</p>
          <p className="tabular mt-1 text-[26px] font-semibold leading-none tracking-tight text-text-heading" title={formatWeight(lifetime.deliveredKg)}>
            {formatCompact(lifetime.deliveredKg)} kg
          </p>
          {comparison.deliveredVsAvgPct !== null && (
            <p className="mt-1.5 text-xs text-text-muted">
              {formatPercent(comparison.deliveredVsAvgPct, true)} vs factory avg
            </p>
          )}
        </div>
        <div>
          <p className="text-[13px] text-text-muted">Lifetime earned</p>
          <p className="tabular mt-1 text-[26px] font-semibold leading-none tracking-tight text-text-heading" title={formatCurrency(lifetime.earnedRs)}>
            {formatCompactCurrency(lifetime.earnedRs)}
          </p>
        </div>
        <div>
          <p className="text-[13px] text-text-muted">Fertilizer taken</p>
          <p className="tabular mt-1 text-[26px] font-semibold leading-none tracking-tight text-text-heading" title={formatCurrency(lifetime.fertilizerRs)}>
            {formatCompactCurrency(lifetime.fertilizerRs)}
          </p>
          <p className="mt-1.5 text-xs text-text-muted">
            {lifetime.fertilizerOrders} order{lifetime.fertilizerOrders === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <div>
          <p className="text-[13px] text-text-muted">Grade split (lifetime)</p>
          <p className="mt-1.5 text-sm text-text">
            Super {lifetime.gradeSuperPct}% · Normal {lifetime.gradeNormalPct}%
            {comparison.qualityVsAvgPct !== null && (
              <span className="ml-1.5 text-text-muted">({formatPercent(comparison.qualityVsAvgPct, true)} vs factory avg)</span>
            )}
          </p>
        </div>
        <OutstandingPanel outstanding={metrics.outstanding} />
      </div>
    </div>
  )
}
