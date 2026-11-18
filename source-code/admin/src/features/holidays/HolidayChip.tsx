import { cn } from '@/lib/cn'
import type { Chip } from './calendar-model'
import { CHIP_STYLE } from './holiday-style'

/** One holiday on the calendar: icon + name, coloured by type; dashed when awaiting approval. */
export function HolidayChip({ chip, className }: { chip: Chip; className?: string }) {
  const s = CHIP_STYLE[chip.kind]
  const Icon = s.icon
  return (
    <span
      title={`${s.label}: ${chip.label}`}
      className={cn('flex min-w-0 items-center gap-1 rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[11px] font-medium leading-tight', s.chip, className)}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">{s.label}: </span>
      <span className="truncate">{chip.label}</span>
    </span>
  )
}
