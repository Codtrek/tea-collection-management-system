import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  to?: string
  highlight?: boolean
}

/* Static platform stat (string values, optional link). The count-up StatCard in components/data
   is numeric-only and non-navigable, so this one stays admin-local. */
export function StatCard({ label, value, hint, icon: Icon, to, highlight }: StatCardProps) {
  const body = (
    <div
      className={cn(
        'flex h-full items-start justify-between gap-4 rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-1)] transition-shadow',
        to && 'hover:shadow-[var(--shadow-2)]',
        highlight && 'ring-1 ring-warning-fg/20',
      )}
    >
      <div className="space-y-1">
        <p className="text-[13px] font-medium text-text-muted">{label}</p>
        <p className="tabular text-3xl font-semibold tracking-tight text-text-heading">{value}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
          highlight ? 'bg-warning-bg text-warning-fg' : 'bg-brand-soft text-primary',
        )}
      >
        <Icon className="size-5" />
      </span>
    </div>
  )
  return to ? (
    <Link to={to} className="block rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-primary">
      {body}
    </Link>
  ) : (
    body
  )
}
