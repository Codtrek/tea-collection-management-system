import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  /** Shows the "Contact Administrator" fallback for persistent failures. */
  persistent?: boolean
}

/* Error state with a real recovery path — never a dead end (foundations §5). */
export function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this data. Check your connection and try again.",
  onRetry,
  persistent,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-danger-bg text-danger-fg">
        <AlertTriangle className="size-6" strokeWidth={1.5} />
      </span>
      <h3 className="text-base font-semibold text-text-heading">{title}</h3>
      <p className="mt-1 max-w-xs text-[13px] text-text-muted">{description}</p>
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
        {persistent && (
          <Button size="sm" variant="secondary">
            Contact Administrator
          </Button>
        )}
      </div>
    </div>
  )
}
