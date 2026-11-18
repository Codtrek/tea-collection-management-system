import type { ReactNode } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency } from '@/lib/format'
import { SCHEDULE_TONE, type ScheduleStatus } from './schedule-status'

export interface ScheduleTableRow {
  period: string
  planned: number
  deducted: number
  carried: number
  status: ScheduleStatus
}

interface ScheduleTableProps<R extends ScheduleTableRow> {
  rows: R[]
  /** "Payroll month" / "Settlement period" */
  periodHeader: string
  /** an optional column — e.g. the settlement that deducted (or will deduct) the period */
  extra?: { header: string; render: (row: R) => ReactNode }
}

/*
  The repayment schedule (Planned / Deducted / Carried forward per period) — the ONE table for
  salary and estate owner advances. Rows come from the server's shared installment model.
*/
export function ScheduleTable<R extends ScheduleTableRow>({ rows, periodHeader, extra }: ScheduleTableProps<R>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-[11px] uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-5 py-2 text-left">{periodHeader}</th>
            <th className="px-5 py-2 text-right">Planned</th>
            <th className="px-5 py-2 text-right">Deducted</th>
            <th className="px-5 py-2 text-right">Carried forward</th>
            <th className="px-5 py-2 text-left">Status</th>
            {extra && <th className="px-5 py-2 text-left">{extra.header}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.period} className="border-t border-border">
              <td className="px-5 py-2">{m.period}</td>
              <td className="tabular px-5 py-2 text-right">{formatCurrency(m.planned)}</td>
              <td className="tabular px-5 py-2 text-right">{m.status === 'Planned' ? '—' : formatCurrency(m.deducted)}</td>
              <td className={`tabular px-5 py-2 text-right ${m.carried > 0 ? 'text-warning-fg' : ''}`}>
                {m.carried > 0 ? formatCurrency(m.carried) : '—'}
              </td>
              <td className="px-5 py-2">
                <StatusBadge tone={SCHEDULE_TONE[m.status]}>{m.status}</StatusBadge>
              </td>
              {extra && <td className="px-5 py-2">{extra.render(m)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
