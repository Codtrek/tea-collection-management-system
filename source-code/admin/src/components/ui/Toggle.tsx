import { cn } from '@/lib/cn'

export interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
  disabled?: boolean
  id?: string
}

export function Toggle({ checked, onChange, label, disabled, id }: ToggleProps) {
  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2.5 text-sm', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-[var(--duration-fast)]',
          checked ? 'bg-primary' : 'bg-border-strong',
        )}
      >
        <span
          className={cn(
            'absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-[var(--shadow-1)] transition-transform duration-[var(--duration-fast)]',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && <span className="text-text">{label}</span>}
    </label>
  )
}
