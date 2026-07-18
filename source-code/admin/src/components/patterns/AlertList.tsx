import type { ReactNode } from 'react'
import { AlertOctagon, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type AlertUrgency = 'critical' | 'warning'

export interface AlertListItem {
  key: string
  urgency: AlertUrgency
  title: string
  /** e.g. "Expires in 6 days — 24/07/2026" */
  detail: string
  meta?: string
  actions?: ReactNode
}

/*
  Urgency-grouped alert list (fertilizer doc §FERT-04): color-banded groups
  sorted most-urgent first. Urgency is never conveyed by color alone — each
  group carries an icon + text heading, each row a text detail. Reusable for
  any time-sensitive data (overdue payments, etc.).
*/
const groups: Record<AlertUrgency, { label: string; icon: ReactNode; band: string; chip: string }> = {
  critical: {
    label: 'Critical',
    icon: <AlertOctagon className="size-4" aria-hidden />,
    band: 'border-danger-fg/25',
    chip: 'bg-danger-bg text-danger-fg',
  },
  warning: {
    label: 'Warning',
    icon: <AlertTriangle className="size-4" aria-hidden />,
    band: 'border-warning-fg/25',
    chip: 'bg-warning-bg text-warning-fg',
  },
}

export function AlertList({ items, className }: { items: AlertListItem[]; className?: string }) {
  const order: AlertUrgency[] = ['critical', 'warning']
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {order.map((urgency) => {
        const group = groups[urgency]
        const rows = items.filter((i) => i.urgency === urgency)
        if (rows.length === 0) return null
        return (
          <section
            key={urgency}
            aria-label={`${group.label} alerts`}
            className={cn('overflow-hidden rounded-[var(--radius-lg)] border bg-surface', group.band)}
          >
            <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className={cn('flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-semibold', group.chip)}>
                {group.icon}
                {group.label}
              </span>
              <span className="text-xs text-text-muted">
                {rows.length} {rows.length === 1 ? 'item' : 'items'}
              </span>
            </header>
            <ul className="divide-y divide-border">
              {rows.map((item) => (
                <li key={item.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{item.title}</p>
                    <p className="text-[13px] text-text-muted">{item.detail}</p>
                  </div>
                  {item.meta && <span className="tabular text-sm text-text-muted">{item.meta}</span>}
                  {item.actions && <div className="flex shrink-0 items-center gap-1.5">{item.actions}</div>}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
