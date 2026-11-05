import { ArrowDown, ArrowUp, Equal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { cellText } from './performance-view'
import type { Measure } from './types'

const TREND = {
  up: { icon: ArrowUp, text: 'Higher than their previous 3 months' },
  down: { icon: ArrowDown, text: 'Lower than their previous 3 months' },
  same: { icon: Equal, text: 'About the same as their previous 3 months' },
} as const

/**
 * One measure in a cell: the figure with its counts, a second line when it helps, and a neutral
 * mark against the person's own previous 3 months — an icon plus text, never colour alone, and
 * "up" is not "better". Information measures are grey and never marked.
 */
export function MeasureCell({ measure }: { measure: Measure | undefined }) {
  const t = cellText(measure)
  const trend = measure?.trend ? TREND[measure.trend] : null
  const Icon = trend?.icon
  return (
    <span className="block" title={measure?.reason}>
      <span className={cn('flex items-center gap-1 tabular text-sm', t.muted ? 'text-text-muted' : 'text-text')}>
        {t.main}
        {trend && Icon && (
          <span className="inline-flex items-center text-text-muted" title={`${trend.text} (${measure?.previous})`}>
            <Icon className="size-3.5" aria-hidden />
            <span className="sr-only">{trend.text}</span>
          </span>
        )}
      </span>
      {t.sub && <span className="block text-[11px] text-text-muted">{t.sub}</span>}
    </span>
  )
}
