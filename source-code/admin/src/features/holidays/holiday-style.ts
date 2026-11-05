import { DoorClosed, Flag, Hourglass, Moon, Users, type LucideIcon } from 'lucide-react'
import type { ChipKind } from './calendar-model'

/*
  How each kind of holiday looks (Attendance-Leave-Addendum §4.4). Every chip carries an icon
  and a text label, so colour is never the only signal. Token colours only.
*/
export const CHIP_STYLE: Record<ChipKind, { label: string; icon: LucideIcon; chip: string; dot: string }> = {
  poya: { label: 'Poya day', icon: Moon, chip: 'bg-grade-super-bg text-grade-super-fg', dot: 'bg-grade-super-fg' },
  public: { label: 'Public holiday', icon: Flag, chip: 'bg-approved-bg text-approved-fg', dot: 'bg-approved-fg' },
  closure: { label: 'Factory closure', icon: DoorClosed, chip: 'bg-danger-bg text-danger-fg', dot: 'bg-danger-fg' },
  category: { label: 'Category holiday', icon: Users, chip: 'bg-assigned-bg text-assigned-fg', dot: 'bg-assigned-fg' },
  pending: {
    label: 'Awaiting approval',
    icon: Hourglass,
    chip: 'border border-dashed border-border-strong bg-surface text-text-muted',
    dot: 'border border-dashed border-text-muted',
  },
}

/** Shading for the chosen category's non-working days. */
export const SHADE_STYLE = {
  weekly: { label: 'Weekly holiday', cell: 'bg-surface-hover' },
  half: { label: 'Half day', cell: 'bg-surface-hover/50' },
  category: { label: 'Category holiday', cell: 'bg-assigned-bg/60' },
} as const

export const CATEGORY_LABEL = { factory: 'Factory workers', office: 'Office staff' } as const
export const CATEGORY_LONG = {
  factory: 'Factory workers (Wages Board)',
  office: 'Office staff (Shop & Office Act)',
} as const
export const APPLIES_LABEL = { all: 'All employees', ...CATEGORY_LABEL } as const
