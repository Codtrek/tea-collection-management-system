import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  /** Icon-only buttons must pass aria-label (foundations §7). */
  iconOnly?: boolean
}

const variants: Record<Variant, string> = {
  // Irreversible actions still use primary at lg — red means destructive only.
  primary:
    'bg-primary text-white shadow-[var(--shadow-1)] hover:bg-primary-hover hover:shadow-[var(--shadow-2)] active:bg-primary-active disabled:bg-primary-disabled disabled:shadow-none',
  secondary:
    'bg-surface text-text border border-border hover:bg-surface-hover active:bg-[#edf0ea] disabled:text-text-disabled',
  ghost:
    'bg-transparent text-text-muted hover:bg-surface-hover hover:text-text disabled:text-text-disabled',
  danger:
    'bg-danger text-white hover:bg-danger-hover active:bg-danger-active disabled:opacity-50',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, iconOnly, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        iconOnly && 'aspect-square px-0',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
