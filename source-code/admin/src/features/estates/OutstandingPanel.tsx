import { AlertTriangle } from 'lucide-react'
import type { EstateLifetimeMetrics } from './types'
import { formatCurrency } from '@/lib/format'

/*
  Addendum §6.3 — the Outstanding figure is a live liability, not an
  achievement, and must read differently without shouting. Set on a tinted
  primary panel (never a card on white, never danger-red): owing for
  recently-issued fertilizer is normal and expected, and red here would cry
  wolf on every healthy relationship. Amber = "watch" (only when non-zero),
  green = "clear" at zero, red stays reserved for genuine problems.
*/
export function OutstandingPanel({ outstanding, inactive }: { outstanding: EstateLifetimeMetrics['outstanding']; inactive?: boolean }) {
  // fertilizer + advances (Estate-Owner-Advances-Addendum §4) — the same figure as /estates' Outstanding column
  const total = outstanding.fertilizerUndeductedRs + outstanding.advancesRs
  const owed = total > 0

  return (
    <div className="rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)] p-5">
      <p className="text-[13px] font-medium text-text-muted">Outstanding to factory</p>
      {owed ? (
        <>
          <p className="tabular mt-2 text-[28px] font-semibold leading-none tracking-tight text-primary">{formatCurrency(total)}</p>
          <dl className="tabular mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-text-muted">Fertilizer</dt>
            <dd className="text-right text-text">{formatCurrency(outstanding.fertilizerUndeductedRs)}</dd>
            <dt className="text-text-muted">Advances</dt>
            <dd className="text-right text-text">{formatCurrency(outstanding.advancesRs)}</dd>
          </dl>
          {outstanding.undeductedDispatchCount > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning-fg">
              <AlertTriangle className="size-3.5" aria-hidden />
              {outstanding.undeductedDispatchCount} dispatch{outstanding.undeductedDispatchCount === 1 ? '' : 'es'} not yet deducted
            </p>
          )}
          {outstanding.openAdvanceCount > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-warning-fg">
              <AlertTriangle className="size-3.5" aria-hidden />
              {outstanding.openAdvanceCount} advance{outstanding.openAdvanceCount === 1 ? '' : 's'} still being recovered
            </p>
          )}
          {inactive && outstanding.advancesRs > 0 && (
            <p className="mt-2 text-xs font-medium text-danger-fg">Outstanding advance: estate inactive — no automatic write-off.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-[20px] font-semibold leading-none tracking-tight text-success-fg">Fully settled</p>
      )}
    </div>
  )
}
