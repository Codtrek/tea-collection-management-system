import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import { periodOf, shiftMonth } from '@/lib/month'
import { installmentForMonths, monthsForInstallment, planInstallment, planValueError, previewSchedule, scheduleText, type PlanValue } from './advance-plan'

interface RepaymentPlanFieldsProps {
  amount: number
  value: PlanValue
  onChange: (next: PlanValue) => void
  maxMonths: number
  /** the first month the start-month picker offers (default plan start = next calendar month) */
  firstMonth: string
  /** hides the single / installments choice (the approver edits installments only) */
  installmentsOnly?: boolean
}

/*
  Repayment plan (Salary-Advances-Addendum §10) — one deduction in the next payroll, or monthly
  installments typed as an amount per month OR a number of months (either fills in the other),
  from a start month. Shows the schedule as you type. The server validates again.
*/
export function RepaymentPlanFields({ amount, value, onChange, maxMonths, firstMonth, installmentsOnly }: RepaymentPlanFieldsProps) {
  const set = (patch: Partial<PlanValue>) => onChange({ ...value, ...patch })
  const installment = planInstallment(amount, value)
  const error = amount > 0 ? planValueError(amount, value, maxMonths) : null
  const schedule = amount > 0 && installment > 0 && !error ? previewSchedule(amount, installment, value.startMonth) : []
  const startOptions = Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(firstMonth, i)
    return { value: m, label: periodOf(m) }
  })

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium text-text">Repayment plan</legend>
      {!installmentsOnly && (
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4" role="radiogroup">
          {(
            [
              ['single', 'One deduction in the next payroll'],
              ['installments', 'Monthly installments'],
            ] as const
          ).map(([mode, label]) => (
            <label key={mode} className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="repayment"
                className="size-4 accent-[var(--color-primary)]"
                checked={value.mode === mode}
                onChange={() =>
                  set(
                    mode === 'installments' && !value.installment
                      ? { mode, installment: String(installmentForMonths(amount || 0, Math.min(3, maxMonths)) || ''), months: String(Math.min(3, maxMonths)) }
                      : { mode },
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      )}

      <div className={cn('grid gap-3', value.mode === 'installments' ? 'sm:grid-cols-3' : 'sm:grid-cols-1')}>
        {value.mode === 'installments' && (
          <>
            <Input
              label="Per month (Rs.)"
              type="number"
              min="1"
              inputMode="numeric"
              value={value.installment}
              onChange={(e) => {
                const n = Number(e.target.value)
                set({ installment: e.target.value, months: n > 0 && amount > 0 ? String(monthsForInstallment(amount, n)) : '' })
              }}
            />
            <Input
              label={`Months (max ${maxMonths})`}
              type="number"
              min="1"
              max={maxMonths}
              inputMode="numeric"
              value={value.months}
              onChange={(e) => {
                const n = Number(e.target.value)
                set({ months: e.target.value, installment: n > 0 && amount > 0 ? String(installmentForMonths(amount, n)) : '' })
              }}
            />
          </>
        )}
        <Select label="Start month" value={value.startMonth} onChange={(e) => set({ startMonth: e.target.value })} options={startOptions} />
      </div>

      {error ? (
        <p className="text-xs text-danger-fg" role="alert">
          {error}
        </p>
      ) : (
        schedule.length > 0 && <p className="tabular text-xs text-text-muted">{scheduleText(schedule)}</p>
      )}
    </fieldset>
  )
}
