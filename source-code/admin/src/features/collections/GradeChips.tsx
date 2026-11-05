import { useState } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'
import { sortedLines } from './weights'
import type { CollectionRecord, TeaGrade } from './types'

interface GradeChipsProps {
  record: Pick<CollectionRecord, 'gradeLines' | 'graded'>
  /** a grade the viewer filtered on — its chip gets a ring so the match is obvious */
  highlight?: TeaGrade
  /** chips shown before collapsing the rest behind "+N more" */
  max?: number
  /** show every chip (detail pages) */
  expanded?: boolean
}

/*
  Per-grade weight chips for a delivery: `Super · 32 kg` `Normal · 12.5 kg`. More than `max`
  grades collapse to "+N more", which expands in place. A delivery with no grade lines is
  "Ungraded" — grading is a factory step, so that is a normal waiting state, not an error.
*/
export function GradeChips({ record, highlight, max = 2, expanded = false }: GradeChipsProps) {
  const [open, setOpen] = useState(false)

  if (!record.graded || record.gradeLines.length === 0) {
    return <StatusBadge tone="neutral">Ungraded</StatusBadge>
  }

  const lines = sortedLines(record.gradeLines)
  const showAll = expanded || open || lines.length <= max
  const visible = showAll ? lines : lines.slice(0, max)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((l) => (
        <StatusBadge
          key={l.grade}
          tone={l.grade === 'Super' ? 'gradeSuper' : 'gradeNormal'}
          className={cn(highlight === l.grade && 'ring-1 ring-primary')}
        >
          {l.grade} · {formatWeight(l.weightKg)}
        </StatusBadge>
      ))}
      {!showAll && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation() // the row itself is clickable
            setOpen(true)
          }}
          aria-expanded={false}
          className="rounded-full px-1.5 text-xs font-medium text-primary hover:underline"
        >
          +{lines.length - max} more
        </button>
      )}
    </div>
  )
}
