import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  /** numeric value to animate */
  value: number
  /** formats the animated value, e.g. formatCurrency */
  format: (v: number) => string
  icon?: ReactNode
  /** optional delta, e.g. +6.2 */
  deltaPercent?: number
  /** small supporting note under the value */
  note?: string
  tone?: 'default' | 'warning'
}

/* Animated stat card (foundations §8 — count-up first mount only). */
export function StatCard({ label, value, format, icon, deltaPercent, note, tone = 'default' }: StatCardProps) {
  const animated = useCountUp(value)
  const up = (deltaPercent ?? 0) >= 0
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]',
        tone === 'warning' && 'ring-1 ring-warning-fg/15',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-muted">{label}</span>
        {icon && (
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-[var(--radius-sm)]',
              tone === 'warning' ? 'bg-warning-bg text-warning-fg' : 'bg-brand-soft text-primary',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="tabular text-[34px] font-semibold leading-none tracking-tight text-text-heading">
        {format(animated)}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {deltaPercent !== undefined && (
          <span className={cn('tabular inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-success-fg' : 'text-danger-fg')}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(deltaPercent).toFixed(1)}%
          </span>
        )}
        {note && <span className="text-xs text-text-muted">{note}</span>}
      </div>
    </div>
  )
}
