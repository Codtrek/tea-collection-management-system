import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
  One badge component for every domain status. Always renders a text label
  alongside color (foundations §7 / master §18 — never color alone).
  Each tone maps to a -bg/-fg token pair verified ≥4.5:1.
*/
export type BadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'submitted'
  | 'approved'
  | 'assigned'
  | 'gradeSuper'
  | 'gradeNormal'
  | 'neutral'

const tones: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  submitted: 'bg-submitted-bg text-submitted-fg',
  approved: 'bg-approved-bg text-approved-fg',
  assigned: 'bg-assigned-bg text-assigned-fg',
  gradeSuper: 'bg-grade-super-bg text-grade-super-fg',
  gradeNormal: 'bg-grade-normal-bg text-grade-normal-fg',
  neutral: 'bg-submitted-bg text-submitted-fg',
}

export interface StatusBadgeProps {
  tone: BadgeTone
  children: ReactNode
  icon?: ReactNode
  className?: string
}

export function StatusBadge({ tone, children, icon, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {icon && <span className="flex items-center [&>svg]:size-3">{icon}</span>}
      {children}
    </span>
  )
}
