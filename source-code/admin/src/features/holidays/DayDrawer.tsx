import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import type { Holiday } from '@/features/employees/types'
import * as holidaysService from '@/services/holidays'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { chipKind, weekdayOf, WEEKDAY_NAMES } from './calendar-model'
import { APPLIES_LABEL, CATEGORY_LABEL, CHIP_STYLE } from './holiday-style'

interface DayDrawerProps {
  date: string | null
  onClose: () => void
  onEdit: (h: Holiday) => void
  onCancel: (h: Holiday) => void
}

const SOURCE_LABEL = { manual: 'Entered manually', google: 'Imported from Google', file: 'Imported from a file' } as const

/**
 * One day, beside the calendar: its holidays (type, paid / work allowed, who it applies to, who
 * created it, where it came from), requests awaiting approval, the day type per category, and
 * what it touches — attendance already marked, routes scheduled, approved leave.
 */
export function DayDrawer({ date, onClose, onEdit, onCancel }: DayDrawerProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['holidays', 'day', date],
    queryFn: () => holidaysService.getDay(date!),
    enabled: !!date,
  })
  return (
    <Drawer open={!!date} onClose={onClose} title={date ? formatDate(date) : ''} subtitle={date ? WEEKDAY_NAMES[weekdayOf(date)] : undefined}>
      {isPending ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-text-muted" aria-hidden />
        </div>
      ) : isError ? (
        <p className="text-sm text-danger-fg">Couldn't load this day.</p>
      ) : (
        <div className="flex flex-col gap-5 text-sm">
          <section>
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Day type</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {(['factory', 'office'] as const).map((c) => {
                const d = data.dayType[c]
                return (
                  <div key={c} className="contents">
                    <dt className="text-text-muted">{CATEGORY_LABEL[c]}</dt>
                    <dd className="text-text">
                      {d.working ? (d.type === 'half' ? 'Half day' : 'Working day') : (d.label ?? 'Non-working day')}
                      {!d.working && <span className="text-text-muted"> · {d.paid ? 'paid' : 'unpaid'} · {d.workAllowed ? 'work allowed' : 'no work'}</span>}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>

          <section>
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Holidays</h3>
            {data.holidays.length === 0 ? (
              <p className="text-text-muted">No holiday on this day.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.holidays.map((h) => {
                  const s = CHIP_STYLE[chipKind(h)]
                  const Icon = s.icon
                  return (
                    <li key={h.id} className={cn('rounded-[var(--radius-md)] border border-border p-3', h.cancelled && 'opacity-60')}>
                      <p className="flex items-center gap-2 font-medium text-text">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs', s.chip)}>
                          <Icon className="size-3" aria-hidden /> {s.label}
                        </span>
                        {h.name}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {h.paid ? 'Paid' : 'Unpaid'} · {h.workAllowed ? 'work allowed' : 'no work'} · {APPLIES_LABEL[h.appliesTo]}
                        {h.collectionStops && ' · tea collection stops'}
                      </p>
                      {h.reason && <p className="text-xs text-text-muted">Reason: {h.reason}</p>}
                      <p className="text-xs text-text-muted">
                        {SOURCE_LABEL[h.source]}
                        {h.createdBy && ` · by ${h.createdBy}`}
                        {h.createdAt && `, ${formatDateTime(h.createdAt)}`}
                      </p>
                      {h.cancelled && <p className="text-xs text-danger-fg">Cancelled{h.cancelReason ? ` — ${h.cancelReason}` : ''}</p>}
                      {h.canChange && (
                        <div className="mt-2 flex gap-2">
                          {h.type !== 'closure' && (
                            <Button size="sm" variant="secondary" onClick={() => onEdit(h)}>
                              Edit
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => onCancel(h)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {data.pending.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Awaiting approval</h3>
              <ul className="flex flex-col gap-2">
                {data.pending.map((r) => (
                  <li key={r.id} className="rounded-[var(--radius-md)] border border-dashed border-border-strong p-3">
                    <p className="font-medium text-text">{r.name}</p>
                    <p className="text-xs text-text-muted">{r.summary}</p>
                    <p className="text-xs text-text-muted">
                      Requested by {r.requestedBy}, {formatDateTime(r.requestedAt)}
                      {r.kind === 'emergency' ? ' · in force, the Administrator reviews it' : ' · no effect until approved'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">Impact</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-text-muted">Attendance marked</dt>
              <dd className="text-text">
                {data.impact.attendanceMarked === 0 ? 'None' : `${data.impact.attendanceMarked} employee(s)`}
                {data.impact.attendanceNames.length > 0 && (
                  <span className="block text-xs text-text-muted">
                    {data.impact.attendanceNames.join(', ')}
                    {data.impact.attendanceMarked > data.impact.attendanceNames.length && '…'}
                  </span>
                )}
              </dd>
              <dt className="text-text-muted">Routes scheduled</dt>
              <dd className="text-text">{data.impact.routes.length === 0 ? 'None' : data.impact.routes.map((r) => r.name).join(', ')}</dd>
              <dt className="text-text-muted">Approved leave</dt>
              <dd className="text-text-muted">{data.impact.approvedLeave === null ? 'Shown once leave requests are live' : data.impact.approvedLeave}</dd>
            </dl>
          </section>
        </div>
      )}
    </Drawer>
  )
}
