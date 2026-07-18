import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const cbId = id ?? autoId
  return (
    <label htmlFor={cbId} className="inline-flex cursor-pointer items-center gap-2 text-sm text-text">
      <span className="relative inline-flex">
        <input
          ref={ref}
          id={cbId}
          type="checkbox"
          className={cn('peer size-[18px] cursor-pointer appearance-none rounded-[var(--radius-xs)] border border-border-strong bg-surface transition-colors checked:border-primary checked:bg-primary', className)}
          {...props}
        />
        <Check className="pointer-events-none absolute left-0 top-0 size-[18px] scale-75 p-[2px] text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      {label && <span>{label}</span>}
    </label>
  )
})
