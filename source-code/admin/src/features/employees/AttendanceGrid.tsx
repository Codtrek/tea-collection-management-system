import { cn } from '@/lib/cn'
import { CODE_CLASS, CODE_LABEL, DAY_TAG, isNonWorking } from './attendance-view'
import type { AttendanceCode, AttendanceMonth, AttendanceMonthRow } from './types'

interface AttendanceGridProps {
  data: AttendanceMonth
  onRowClick?: (row: AttendanceMonthRow) => void
  /** hide the name column + totals (the employee's own tab shows one row) */
  single?: boolean
}

const CODES: AttendanceCode[] = ['P', 'A', 'L', 'H', 'S', 'W']

/*
  The month grid (Attendance-Leave-Addendum Phase 1): a letter code in a coloured cell; not
  marked = an empty outlined cell (clearly not Absent); non-working days shaded + labelled
  (Weekly / Poya / Public / Closure); today ringed; future days empty and inert. Totals per
  employee. Status is never colour-only — the letter and the tooltip carry it.
*/
export function AttendanceGrid({ data, onRowClick, single }: AttendanceGridProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border px-4 py-2.5 text-xs text-text-muted">
        {CODES.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className={cn('flex size-5 items-center justify-center rounded-[var(--radius-xs)] text-[11px] font-semibold', CODE_CLASS[c])}>{c}</span>
            {CODE_LABEL[c]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-5 rounded-[var(--radius-xs)] border border-dashed border-border-strong" /> Not marked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-5 rounded-[var(--radius-xs)] bg-surface-sunken" /> Non-working day
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border">
              {!single && (
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Employee
                </th>
              )}
              {data.days.map((d) => (
                <th
                  key={d.date}
                  scope="col"
                  title={d.label ?? undefined}
                  className={cn(
                    'min-w-[30px] px-0.5 py-1.5 text-center font-medium text-text-muted',
                    isNonWorking(d.dayType) && 'bg-surface-sunken',
                    d.today && 'text-primary',
                  )}
                >
                  <span className="block tabular">{Number(d.date.slice(8))}</span>
                  <span className="block text-[9px] font-normal leading-tight">{DAY_TAG[d.dayType] ?? ' '}</span>
                </th>
              ))}
              {!single && (
                <>
                  <th className="px-2 py-2 text-right text-[11px] font-medium text-text-muted" title="Present">P</th>
                  <th className="px-2 py-2 text-right text-[11px] font-medium text-text-muted" title="Absent">A</th>
                  <th className="px-2 py-2 text-right text-[11px] font-medium text-text-muted" title="Leave">L</th>
                  <th className="px-2 py-2 text-right text-[11px] font-medium text-text-muted" title="Half-day">H</th>
                  <th className="px-2 py-2 text-right text-[11px] font-medium text-text-muted" title="Short leaves">S</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted" title="Present days ÷ working days">%</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr
                key={r.employeeId}
                className={cn('border-b border-border last:border-0', onRowClick && 'cursor-pointer hover:bg-surface-hover')}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
              >
                {!single && (
                  <td className="sticky left-0 z-10 bg-surface px-3 py-1.5">
                    <span className="block whitespace-nowrap text-sm font-medium text-text">{r.name}</span>
                    <span className="block whitespace-nowrap text-[11px] text-text-muted">
                      {r.employeeId} · {r.role}
                      {r.routes.length > 0 && ` · ${r.routes.map((x) => x.name).join(', ')}`}
                    </span>
                  </td>
                )}
                {r.cells.map((c) => {
                  const off = isNonWorking(c.dayType)
                  const isToday = c.date === data.today
                  return (
                    <td key={c.date} className={cn('px-0.5 py-1 text-center', off && 'bg-surface-sunken')}>
                      <span
                        title={c.lockedReason ? `${c.tooltip} · ${c.lockedReason}` : c.tooltip}
                        aria-label={c.tooltip}
                        className={cn(
                          'mx-auto flex size-6 items-center justify-center rounded-[var(--radius-xs)] text-[11px] font-semibold',
                          c.code
                            ? CODE_CLASS[c.code]
                            : c.future || off
                              ? ''
                              : 'border border-dashed border-border-strong',
                          isToday && 'ring-2 ring-primary ring-offset-1',
                        )}
                      >
                        {c.code ?? ''}
                      </span>
                    </td>
                  )
                })}
                {!single && (
                  <>
                    <td className="tabular px-2 text-right">{r.totals.present}</td>
                    <td className="tabular px-2 text-right">{r.totals.absent}</td>
                    <td className="tabular px-2 text-right">{r.totals.leave}</td>
                    <td className="tabular px-2 text-right">{r.totals.half}</td>
                    <td className="tabular px-2 text-right">{r.totals.short}</td>
                    <td className="tabular px-3 text-right font-medium">
                      {r.totals.pct === null ? '—' : `${r.totals.pct}%`}
                      {r.totals.unmarked > 0 && <span className="block text-[10px] font-normal text-warning-fg">{r.totals.unmarked} unmarked</span>}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
