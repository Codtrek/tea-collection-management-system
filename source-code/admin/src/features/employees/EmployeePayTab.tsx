import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import * as employeesService from '@/services/employees'
import { PayHistoryTable } from './PayRatesPanel'
import { rate4 } from './pay-format'

/*
  An employee's Pay (Administration-Addendum §6): the rates in force today and where they come
  from (their own rate or their role's), the next scheduled change, and every version that applies
  to them. `payRates: view`. `actions` is where "Change pay" sits.
*/
export function EmployeePayTab({ employeeId, actions }: { employeeId: string; actions?: ReactNode }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['employees', 'pay', employeeId],
    queryFn: () => employeesService.getEmployeePay(employeeId),
  })
  if (isPending) return <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
  if (isError || !data) return <ErrorState title="Couldn't load pay history" onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-1)]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Pay in force today (Rs./hour)</p>
          {data.current ? (
            <>
              <p className="tabular mt-1 text-lg font-semibold text-text-heading">{rate4(data.current)}</p>
              <p className="mt-0.5 text-sm text-text-muted">
                Day · day OT · night · night OT ·{' '}
                {data.current.source === 'override' ? (
                  <StatusBadge tone="assigned">Own rate</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">{data.role} role rate</StatusBadge>
                )}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-danger-fg">No pay rate in force: payroll can’t price this employee’s days.</p>
          )}
          {data.next && (
            <p className="mt-2 text-sm text-text">
              Next change {formatDate(data.next.effectiveDate)}: day {formatCurrency(data.next.dayRate)}/hour
              {data.next.scope === 'role' ? ` (${data.next.role} role rate)` : ' (own rate)'}
            </p>
          )}
        </div>
        {actions}
      </div>
      <div className="rounded-[var(--radius-lg)] bg-surface py-2 shadow-[var(--shadow-1)]">
        <PayHistoryTable versions={data.history} showScope />
      </div>
    </div>
  )
}
