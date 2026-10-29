import { cn } from '@/lib/cn'

export interface CoverageBarProps {
  /** 0–100, already capped by the caller; null = nothing to cover (no bar) */
  barPct: number | null
  /** what's printed beside the bar, e.g. "75%", ">999%", "No demand" */
  text: string
  className?: string
}

/*
  Coverage bar (addendum §5.3): how much of the pending demand the available stock covers.
  The bar and its number mean the same thing — the number is always printed and a Status badge
  accompanies every row, so meaning never rests on colour alone (foundations §18). Full = covered
  (brand); anything less is a shortfall (danger).
*/
export function CoverageBar({ barPct, text, className }: CoverageBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {barPct === null ? (
        <span className="flex-1" />
      ) : (
        <div
          className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken"
          role="img"
          aria-label={`Covers ${text} of pending demand`}
        >
          <span
            className={cn('absolute inset-y-0 left-0 rounded-full', barPct >= 100 ? 'bg-brand' : 'bg-danger')}
            style={{ width: `${barPct}%` }}
          />
        </div>
      )}
      <span className="tabular w-16 shrink-0 whitespace-nowrap text-right text-xs font-medium text-text-muted">{text}</span>
    </div>
  )
}
