import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  helpLink?: ReactNode
}

/* Empty state: illustration + one-line message + why + CTA + help link (foundations §5). */
export function EmptyState({ icon, title, description, action, helpLink }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-12 text-center">
      {icon && (
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-soft text-primary">
          {icon}
        </span>
      )}
      <h3 className="text-base font-semibold text-text-heading">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-[13px] text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
      {helpLink && <div className="mt-2 text-[13px]">{helpLink}</div>}
    </div>
  )
}
