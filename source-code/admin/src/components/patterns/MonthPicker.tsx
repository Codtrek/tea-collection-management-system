import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { shiftMonth } from '@/lib/month'

export const ALL_PERIODS = 'all'

interface MonthPickerProps {
  /** 'YYYY-MM', or ALL_PERIODS when `allOption` is set */
  month: string
  /** newest first (monthOptionsFor) — the first is the latest month the arrows reach */
  options: { value: string; label: string }[]
  onChange: (month: string) => void
  /** adds "All periods" to the dropdown (the arrows are disabled while it's chosen) */
  allOption?: boolean
  ariaLabel?: string
  /** e.g. the month status badge */
  badge?: ReactNode
}

/*
  The month picker every month-scoped list uses (Payroll, Payment Settlements): ← / dropdown / →,
  never past the newest option (no future months). The page keeps the month in `?month=`.
*/
export function MonthPicker({ month, options, onChange, allOption, ariaLabel = 'Month', badge }: MonthPickerProps) {
  const latest = options[0]?.value ?? month
  const earliest = options[options.length - 1]?.value ?? month
  const all = month === ALL_PERIODS
  const choices = allOption ? [...options, { value: ALL_PERIODS, label: 'All periods' }] : options

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Button
        variant="secondary"
        size="sm"
        aria-label="Previous month"
        title="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
        disabled={all || month <= earliest}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Select aria-label={ariaLabel} value={month} onChange={(e) => onChange(e.target.value)} options={choices} />
      <Button
        variant="secondary"
        size="sm"
        aria-label="Next month"
        title="Next month"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={all || month >= latest}
      >
        <ChevronRight className="size-4" />
      </Button>
      {badge}
    </div>
  )
}
