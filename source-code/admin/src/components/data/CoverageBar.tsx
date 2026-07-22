import { cn } from '@/lib/cn'

export interface CoverageBarProps {
  onHand: number
  committed: number
  available: number
  /** available ÷ pending demand, as a fraction; null when there is no pending demand. */
  ratio: number | null
  className?: string
}

/*
  Segmented stock-coverage bar (addendum §5.3). Three parts — available (brand),
  committed-covered (primary), and shortfall (danger) overhanging when committed
  exceeds on hand. The percentage is ALWAYS printed and a Status badge accompanies
  every row, so meaning never rests on color alone (foundations §18).
*/
export function CoverageBar({ onHand, committed, available, ratio, className }: CoverageBarProps) {
  const shortfall = Math.max(0, -available)
  const denom = Math.max(onHand, committed) || 1
  const pct = (v: number) => `${(v / denom) * 100}%`

  const availableWidth = Math.max(0, available)
  const committedCovered = Math.min(committed, onHand)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken"
        role="img"
        aria-label={`Available ${available} kg, committed ${committed} kg${shortfall ? `, shortfall ${shortfall} kg` : ''}`}
      >
        <div className="absolute inset-y-0 left-0 flex">
          <span className="h-2 bg-brand" style={{ width: pct(availableWidth) }} />
          <span className="h-2 bg-primary/45" style={{ width: pct(committedCovered) }} />
          <span className="h-2 bg-danger" style={{ width: pct(shortfall) }} />
        </div>
      </div>
      <span className="tabular w-12 shrink-0 text-right text-xs font-medium text-text-muted">
        {ratio === null ? '—' : `${Math.round(ratio * 100)}%`}
      </span>
    </div>
  )
}
