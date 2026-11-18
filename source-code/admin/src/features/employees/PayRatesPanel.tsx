import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Loader2, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/AuthContext'
import { PayAdjustmentsList } from './PayAdjustmentsList'
import { formatCurrency, formatDate } from '@/lib/format'
import * as employeesService from '@/services/employees'
import type { PayVersion } from './types'
import { rate4 } from './pay-format'

/*
  Pay Rates (Administration-Addendum §6) — every role's rate in force today (the 4 hourly rates),
  the next scheduled change, and who is on the role rate vs their own override. Rows open the
  role's history. Pay is never edited in place: changes are dated, approved pay changes.
  Shared by Factory Setup → Pay Rates and People → Pay Rates.
*/

const SOURCE_LABEL: Record<PayVersion['source'], string> = {
  migration: 'On record when pay history started',
  registration: 'Set on registration',
  adjustment: 'Approved pay change',
}

export function PayVersionStatus({ status }: { status: PayVersion['status'] }) {
  if (status === 'current') return <StatusBadge tone="success">Current</StatusBadge>
  if (status === 'scheduled') return <StatusBadge tone="warning">Scheduled</StatusBadge>
  return null
}

/** A pay history table: date, the 4 rates, why, who. */
export function PayHistoryTable({ versions, showScope = false }: { versions: PayVersion[]; showScope?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-2 font-medium">From</th>
            {showScope && <th className="px-3 py-2 font-medium">Applies to</th>}
            <th className="px-3 py-2 text-right font-medium">Day</th>
            <th className="px-3 py-2 text-right font-medium">Day OT</th>
            <th className="px-3 py-2 text-right font-medium">Night</th>
            <th className="px-3 py-2 text-right font-medium">Night OT</th>
            <th className="px-3 py-2 font-medium">Reason</th>
            <th className="px-4 py-2 font-medium">Set by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {versions.map((v) => (
            <tr key={v.id}>
              <td className="whitespace-nowrap px-4 py-2">
                {formatDate(v.effectiveDate)} <PayVersionStatus status={v.status} />
              </td>
              {showScope && <td className="px-3 py-2">{v.scope === 'role' ? `Role: ${v.role}` : 'Own rate'}</td>}
              <td className="tabular whitespace-nowrap px-3 py-2 text-right">{formatCurrency(v.dayRate)}</td>
              <td className="tabular whitespace-nowrap px-3 py-2 text-right">{formatCurrency(v.dayOtRate)}</td>
              <td className="tabular whitespace-nowrap px-3 py-2 text-right">{formatCurrency(v.nightRate)}</td>
              <td className="tabular whitespace-nowrap px-3 py-2 text-right">{formatCurrency(v.nightOtRate)}</td>
              <td className="px-3 py-2">
                {v.reason}
                {v.source !== 'migration' && <span className="block text-xs text-text-muted">{SOURCE_LABEL[v.source]}</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-2">{v.setBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PayRatesPanel({ actions }: { actions?: ReactNode }) {
  const { can } = useAuth()
  const [open, setOpen] = useState<string | null>(null)
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['employees', 'pay-rates'], queryFn: employeesService.getPayRates })

  if (isPending) return <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
  if (isError || !data) return <ErrorState title="Couldn't load pay rates" onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-text-heading">Pay by role</h3>
            <p className="mt-0.5 max-w-2xl text-sm text-text-muted">
              Hourly rates (day · day OT · night · night OT). An employee is paid their own rate when they have one, otherwise
              their role’s rate. Payroll prices each day at the rates in force that day; processed payroll never changes.
            </p>
          </div>
          {actions ??
            (can('payRates', 'edit') && (
              <Link to="/employees/pay-rates/change" className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover">
                <Plus className="size-4" aria-hidden /> New pay change
              </Link>
            ))}
        </div>
        <div className="hidden grid-cols-[1.3fr_1fr_2fr_1.3fr] gap-3 border-b border-border px-5 py-2 text-xs font-medium uppercase tracking-wide text-text-muted md:grid">
          <span>Role</span>
          <span>Employees</span>
          <span>Rates in force (Rs./hour)</span>
          <span>Next change</span>
        </div>
        <ul className="divide-y divide-border">
          {data.map((r) => {
            const expanded = open === r.role
            const own = r.employees.filter((e) => e.onOverride).length
            return (
              <li key={r.role}>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : r.role)}
                  aria-expanded={expanded}
                  className="grid w-full gap-1 px-5 py-3 text-left text-sm hover:bg-surface-hover md:grid-cols-[1.3fr_1fr_2fr_1.3fr] md:items-center md:gap-3"
                >
                  <span className="flex items-center gap-2 font-medium text-text">
                    <ChevronDown className={cn('size-4 text-text-muted transition-transform', expanded && 'rotate-180')} aria-hidden />
                    {r.role}
                  </span>
                  <span className="text-text-muted">
                    {r.employees.length} · {r.employees.length - own} on role rate{own ? ` · ${own} own rate` : ''}
                  </span>
                  <span className="tabular text-text">{r.current ? rate4(r.current) : <StatusBadge tone="warning">No role rate</StatusBadge>}</span>
                  <span className="text-text-muted">
                    {r.next ? (
                      <>
                        {formatDate(r.next.effectiveDate)}: {formatCurrency(r.next.dayRate)} day
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </button>
                {expanded && (
                  <div className="flex flex-col gap-4 border-t border-border bg-surface-sunken py-3">
                    <PayHistoryTable versions={r.history} />
                    {r.employees.length > 0 && (
                      <ul className="mx-4 divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface text-sm">
                        {r.employees.map((e) => (
                          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <Link to={`/employees/${e.id}?tab=pay`} className="font-medium text-primary hover:underline">
                              {e.name}
                            </Link>
                            <span className="tabular text-text-muted">
                              {e.current ? rate4(e.current) : 'No rate'} · {e.onOverride ? 'own rate' : 'role rate'}
                              {e.status !== 'Active' && ` · ${e.status}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
      <PayAdjustmentsList />
    </div>
  )
}
