import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarX, Loader2, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import * as dispatchService from '@/services/dispatch'
import { factoryToday, WEEKDAY_LABELS, weekdayOf } from './status'
import type { BoardRoute, RouteSchedule } from './types'

interface RouteScheduleModalProps {
  open: boolean
  routes: BoardRoute[]
  /** route to open on */
  initialRouteId: number | null
  /** dispatch = Edit: add / cancel / move a single date */
  canEdit: boolean
  /** dispatch = Approve: change the weekly pattern */
  canApprove: boolean
  onClose: () => void
}

type Change = 'CANCEL' | 'ADD' | 'MOVE'

const CHANGE_OPTIONS = [
  { value: 'CANCEL', label: 'Cancel a collection day' },
  { value: 'ADD', label: 'Add an extra collection day' },
  { value: 'MOVE', label: 'Move a collection day' },
]

/*
  Route schedule (Route-Schedule-Addendum): a route runs on set weekdays, plus one-date
  changes an officer makes (cancel / add / move, each with a reason). The server is the only
  place the schedule is interpreted — this dialog shows what it returns (the next four weeks,
  already resolved) and never works out "does it run that day" itself.
*/
export function RouteScheduleModal({ open, routes, initialRouteId, canEdit, canApprove, onClose }: RouteScheduleModalProps) {
  const [routeId, setRouteId] = useState(String(initialRouteId ?? routes[0]?.routeId ?? ''))

  const schedule = useQuery({
    queryKey: ['dispatch', 'schedule', routeId],
    queryFn: () => dispatchService.getRouteSchedule(Number(routeId)),
    enabled: open && routeId !== '',
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Route schedule"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <Select
          label="Route"
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          options={routes.map((r) => ({ value: String(r.routeId), label: r.name }))}
        />
        {schedule.isPending ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-text-muted" aria-hidden />
          </div>
        ) : schedule.isError || !schedule.data ? (
          <p className="text-sm text-danger-fg">Could not load this route’s schedule.</p>
        ) : (
          // keyed by route + pattern so the editable copies reset when either changes
          <ScheduleBody
            key={`${schedule.data.routeId}-${schedule.data.weekdays.join(',')}`}
            data={schedule.data}
            canEdit={canEdit}
            canApprove={canApprove}
          />
        )}
      </div>
    </Modal>
  )
}

function ScheduleBody({ data, canEdit, canApprove }: { data: RouteSchedule; canEdit: boolean; canApprove: boolean }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [weekdays, setWeekdays] = useState<number[]>(data.weekdays)
  const [change, setChange] = useState<Change>('CANCEL')
  const [date, setDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')

  const patternChanged = weekdays.join(',') !== data.weekdays.join(',')
  const today = factoryToday()

  const refresh = (updated: RouteSchedule) => {
    queryClient.setQueryData(['dispatch', 'schedule', String(updated.routeId)], updated)
    void queryClient.invalidateQueries({ queryKey: ['dispatch', 'board'] })
  }
  const fail = (err: unknown) => toast(err instanceof Error ? err.message : 'Could not change the schedule', 'danger')

  const patternMutation = useMutation({
    mutationFn: () => dispatchService.setRouteWeekdays(data.routeId, weekdays),
    onSuccess: (updated) => {
      refresh(updated)
      toast(`${data.routeName} now runs on ${describe(updated.weekdays)}`)
    },
    onError: fail,
  })

  const changeMutation = useMutation({
    mutationFn: () =>
      change === 'MOVE'
        ? dispatchService.moveScheduleDate(data.routeId, { fromDate: date, toDate, reason: reason.trim() })
        : dispatchService.addScheduleOverride(data.routeId, { date, kind: change, reason: reason.trim() }),
    onSuccess: (updated) => {
      refresh(updated)
      toast(
        change === 'MOVE'
          ? `Moved ${formatDate(date)} to ${formatDate(toDate)}`
          : change === 'ADD'
            ? `Added ${formatDate(date)} to ${data.routeName}`
            : `Cancelled ${data.routeName} on ${formatDate(date)}`,
      )
      setDate('')
      setToDate('')
      setReason('')
    },
    onError: fail,
  })

  const removeMutation = useMutation({
    mutationFn: (overrideId: number) => dispatchService.removeScheduleOverride(data.routeId, overrideId),
    onSuccess: (updated) => {
      refresh(updated)
      toast('Schedule change removed — the weekly pattern applies again')
    },
    onError: fail,
  })

  const changeReady = !!date && !!reason.trim() && (change !== 'MOVE' || !!toDate)

  return (
    <>
      <section aria-labelledby="weekly-pattern">
        <h3 id="weekly-pattern" className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Weekly pattern
        </h3>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Collection weekdays">
          {WEEKDAY_LABELS.map((label, day) => {
            const on = weekdays.includes(day)
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                disabled={!canApprove}
                onClick={() => setWeekdays(on ? weekdays.filter((d) => d !== day) : [...weekdays, day].sort((a, b) => a - b))}
                className={cn(
                  'h-9 min-w-12 rounded-[var(--radius-md)] border px-3 text-sm font-medium',
                  on ? 'border-primary bg-brand-soft text-primary' : 'border-border bg-surface text-text-muted',
                  canApprove ? 'hover:border-primary' : 'cursor-not-allowed opacity-70',
                )}
              >
                {label}
              </button>
            )
          })}
          {canApprove && (
            <Button
              size="sm"
              className="ml-auto"
              disabled={!patternChanged}
              loading={patternMutation.isPending}
              onClick={() => patternMutation.mutate()}
            >
              Save pattern
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          {canApprove
            ? 'An agent runs one route a day, so a pattern that puts an agent on two of his routes on the same day is refused.'
            : 'Changing the weekly pattern needs permission to approve dispatch changes.'}
        </p>
      </section>

      <section aria-labelledby="next-weeks">
        <h3 id="next-weeks" className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Next four weeks
          {data.nextCollectionDay && (
            <span className="ml-2 normal-case tracking-normal">· next collection {formatDate(data.nextCollectionDay)}</span>
          )}
        </h3>
        <ol className="grid grid-cols-7 gap-1">
          {data.upcoming.map((d) => (
            <li
              key={d.date}
              title={`${formatDate(d.date)} — ${d.scheduled ? 'collection day' : 'no collection'}${d.override === 'ADD' ? ' (added)' : d.override === 'CANCEL' ? ' (cancelled)' : ''}`}
              className={cn(
                'tabular flex flex-col items-center rounded-[var(--radius-sm)] border px-1 py-1.5 text-xs',
                d.scheduled ? 'border-transparent bg-approved-bg text-approved-fg' : 'border-border text-text-muted',
                d.date === today && 'ring-2 ring-primary',
              )}
            >
              <span>{WEEKDAY_LABELS[weekdayOf(d.date)]}</span>
              <span className={cn('font-medium', d.override === 'CANCEL' && 'line-through')}>{Number(d.date.slice(8))}</span>
              <span className="h-3.5 text-[10px] leading-3.5">
                {d.override === 'ADD' ? 'added' : d.override === 'CANCEL' ? 'cancelled' : ''}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="date-changes">
        <h3 id="date-changes" className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Changes to single dates
        </h3>
        {data.overrides.length === 0 ? (
          <p className="text-sm text-text-muted">None — the weekly pattern applies on every date.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {data.overrides.map((o) => (
              <li key={o.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                <StatusBadge tone={o.kind === 'ADD' ? 'approved' : 'neutral'}>
                  {o.kind === 'ADD' ? 'Added' : 'Cancelled'}
                </StatusBadge>
                <span className="min-w-0 flex-1">
                  <span className="tabular font-medium text-text">{formatDate(o.date)}</span>
                  {o.moveGroup && <span className="text-text-muted"> · part of a move</span>}
                  <span className="block text-xs text-text-muted">
                    {o.reason} — {o.createdBy}
                  </span>
                </span>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    iconOnly
                    aria-label={`Remove the change on ${formatDate(o.date)}`}
                    loading={removeMutation.isPending && removeMutation.variables === o.id}
                    onClick={() => removeMutation.mutate(o.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <div className="mt-3 grid gap-3 rounded-[var(--radius-md)] border border-border p-3 sm:grid-cols-2">
            <Select
              label="Change"
              value={change}
              onChange={(e) => setChange(e.target.value as Change)}
              options={CHANGE_OPTIONS}
            />
            <Input
              label={change === 'MOVE' ? 'Move from' : 'Date'}
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {change === 'MOVE' && (
              <Input label="Move to" type="date" min={today} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            )}
            <Input
              label="Reason"
              placeholder="e.g. Road closed, Poya holiday"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex items-end sm:col-span-2">
              <Button
                size="sm"
                disabled={!changeReady}
                loading={changeMutation.isPending}
                onClick={() => changeMutation.mutate()}
              >
                <CalendarX className="size-4" /> Apply change
              </Button>
              <span className="ml-3 text-xs text-text-muted">
                A cover arranged for a cancelled date is cancelled and the agent is told.
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

function describe(days: number[]): string {
  return days.length === 0 ? 'no days' : days.map((d) => WEEKDAY_LABELS[d]).join(', ')
}
