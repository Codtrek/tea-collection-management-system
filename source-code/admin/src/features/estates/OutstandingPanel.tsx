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
export function OutstandingPanel({ outstanding }: { outstanding: EstateLifetimeMetrics['outstanding'] }) {
  const owed = outstanding.fertilizerUndeductedRs > 0

  return (
    <div className="rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)] p-5">
      <p className="text-[13px] font-medium text-text-muted">Outstanding to factory</p>
      {owed ? (
        <>
          <p className="tabular mt-2 text-[28px] font-semibold leading-none tracking-tight text-primary">
            {formatCurrency(outstanding.fertilizerUndeductedRs)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning-fg">
            <AlertTriangle className="size-3.5" aria-hidden />
            {outstanding.undeductedDispatchCount} dispatch{outstanding.undeductedDispatchCount === 1 ? '' : 'es'} not
            yet deducted
          </p>
        </>
      ) : (
        <p className="mt-2 text-[20px] font-semibold leading-none tracking-tight text-success-fg">Fully settled</p>
      )}
    </div>
  )
}
