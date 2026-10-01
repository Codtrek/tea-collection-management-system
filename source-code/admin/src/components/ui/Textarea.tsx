import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const areaId = id ?? autoId

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        aria-invalid={!!error}
        className={cn(
          'w-full resize-y rounded-[var(--radius-sm)] border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-disabled transition-colors',
          'focus:border-primary focus:outline-none',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-[13px] text-danger-fg">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
})
