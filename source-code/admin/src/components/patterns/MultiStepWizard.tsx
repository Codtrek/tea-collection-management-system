import { type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface WizardStep {
  id: string
  label: string
}

export interface MultiStepWizardProps {
  steps: WizardStep[]
  current: number
  /** allow clicking back to a completed step */
  onStepClick?: (index: number) => void
  children: ReactNode
}

/* Multi-step wizard shell: step indicator + panel (master §11). Reused by EMP-02 & EST-02. */
export function MultiStepWizard({ steps, current, onStepClick, children }: MultiStepWizardProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
        {steps.map((step, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={step.id} className="shrink-0">
              <button
                type="button"
                onClick={() => (done || active) && onStepClick?.(i)}
                disabled={i > current}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors',
                  active ? 'bg-brand-soft font-medium text-primary' : 'text-text-muted',
                  (done || active) && 'hover:bg-surface-hover',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    done ? 'bg-primary text-white' : active ? 'border-2 border-primary text-primary' : 'border border-border-strong text-text-muted',
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="hidden lg:block">{step.label}</span>
                <span className="lg:hidden">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <div>{children}</div>
    </div>
  )
}
