import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Combobox } from '@/components/ui/Combobox'
import type { HolidayRequest, HolidayYear } from '@/features/employees/types'
import * as holidaysService from '@/services/holidays'
import * as employeesService from '@/services/employees'
import { formatDate, formatDateTime } from '@/lib/format'
import { chipKind, dayList, ruleInForce, upcoming, WEEKDAY_NAMES } from './calendar-model'
import { CATEGORY_LONG, CHIP_STYLE, SHADE_STYLE } from './holiday-style'
import { cn } from '@/lib/cn'

export interface HolidayAbilities {
  /** Poya / public holidays, type settings, import (holidayStatutory: edit) */
  statutory: boolean
  /** category holidays, rest days, closures (holidayCalendar: edit) */
  calendar: boolean
  /** sets the weekly holiday directly and decides requests (holidayCalendar: approve) */
  approver: boolean
}

interface SidePanelProps {
  data: HolidayYear
  today: string
  can: HolidayAbilities
  onDone: (msg: string) => void
  onFailed: (err: unknown) => void
  onOpenDay: (date: string) => void
  onDecide: (r: HolidayRequest, decision: 'approve' | 'reject') => void
}

/** The calendar's right-hand panel (Attendance-Leave-Addendum §4.4). Each card shows only what the viewer may do. */
export function SidePanel({ data, today, can, onDone, onFailed, onOpenDay, onDecide }: SidePanelProps) {
  const next = upcoming(data.holidays, today)
  return (
    <div className="flex flex-col gap-4">
      {can.approver && data.pending.length > 0 && <PendingApprovals pending={data.pending} onDecide={onDecide} onOpenDay={onOpenDay} />}

      <Card>
        <CardTitle className="mb-2">Upcoming holidays</CardTitle>
        {next.length === 0 ? (
          <p className="text-sm text-text-muted">Nothing ahead in {data.year}.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {next.map((h) => {
              const s = CHIP_STYLE[chipKind(h)]
              const Icon = s.icon
              return (
                <li key={h.id}>
                  <button type="button" onClick={() => onOpenDay(h.date)} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 text-left hover:bg-surface-hover">
                    <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)]', s.chip)} title={s.label}>
                      <Icon className="size-3" aria-hidden />
                      <span className="sr-only">{s.label}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-text">{h.name}</span>
                    <span className="shrink-0 text-xs text-text-muted tabular">{formatDate(h.date)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-2">Legend</CardTitle>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-text">
          {Object.values(CHIP_STYLE).map((s) => {
            const Icon = s.icon
            return (
              <li key={s.label} className="flex items-center gap-1.5">
                <span className={cn('flex size-5 items-center justify-center rounded-[var(--radius-xs)]', s.chip)}>
                  <Icon className="size-3" aria-hidden />
                </span>
                {s.label}
              </li>
            )
          })}
          <li className="flex items-center gap-1.5">
            <span className={cn('size-5 rounded-[var(--radius-xs)] border border-border', SHADE_STYLE.weekly.cell)} /> Weekly holiday
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-5 rounded-[var(--radius-xs)] outline outline-2 -outline-offset-2 outline-primary" /> Today
          </li>
        </ul>
      </Card>

      <TypesCard data={data} can={can} onDone={onDone} onFailed={onFailed} />
      <WeeklyCard data={data} today={today} can={can} onDone={onDone} onFailed={onFailed} />
      {(can.calendar || data.restDays.length > 0) && <RestDaysCard data={data} today={today} can={can} onDone={onDone} onFailed={onFailed} />}
    </div>
  )
}

function PendingApprovals({ pending, onDecide, onOpenDay }: { pending: HolidayRequest[]; onDecide: SidePanelProps['onDecide']; onOpenDay: (d: string) => void }) {
  return (
    <Card className="border-warning-fg/30">
      <CardTitle className="mb-2">Pending approvals ({pending.length})</CardTitle>
      <ul className="flex flex-col gap-3 text-sm">
        {pending.map((r) => (
          <li key={r.id} className="rounded-[var(--radius-md)] border border-dashed border-border-strong p-3">
            <button type="button" className="text-left font-medium text-text hover:text-primary" onClick={() => onOpenDay(r.dateFrom)}>
              {r.kind === 'emergency' ? 'Emergency closure (in force) — ' : ''}
              {r.name}
            </button>
            <p className="text-xs text-text-muted">{r.summary}</p>
            {r.reason && <p className="text-xs text-text-muted">Reason: {r.reason}</p>}
            <p className="text-xs text-text-muted">
              {r.requestedBy}, {formatDateTime(r.requestedAt)}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => onDecide(r, 'approve')}>
                {r.kind === 'emergency' ? 'Keep' : 'Approve'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onDecide(r, 'reject')}>
                {r.kind === 'emergency' ? 'Revert' : 'Reject'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

type CardProps = Pick<SidePanelProps, 'data' | 'can' | 'onDone' | 'onFailed'> & { today?: string }

function TypesCard({ data, can, onDone, onFailed }: CardProps) {
  const typeMutation = useMutation({
    mutationFn: (v: { type: string; paid: boolean; workAllowed: boolean }) => holidaysService.updateType(v.type, v),
    onSuccess: () => onDone('Holiday type updated'),
    onError: onFailed,
  })
  const weekMutation = useMutation({
    mutationFn: (d: 0 | 1) => holidaysService.setWeekStartsOn(d),
    onSuccess: () => onDone('Week start saved'),
    onError: onFailed,
  })
  return (
    <Card>
      <CardTitle className="mb-3">Holiday type settings</CardTitle>
      <ul className="flex flex-col gap-3 text-sm">
        {data.types.map((t) => (
          <li key={t.type} className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-text">{t.label}</span>
            {can.statutory ? (
              <span className="flex gap-3">
                <Checkbox
                  label="Paid"
                  checked={t.paid}
                  disabled={typeMutation.isPending}
                  onChange={(e) => typeMutation.mutate({ type: t.type, paid: e.target.checked, workAllowed: t.workAllowed })}
                />
                <Checkbox
                  label="Work allowed"
                  checked={t.workAllowed}
                  disabled={typeMutation.isPending}
                  onChange={(e) => typeMutation.mutate({ type: t.type, paid: t.paid, workAllowed: e.target.checked })}
                />
              </span>
            ) : (
              <span className="text-text-muted">
                {t.paid ? 'Paid' : 'Unpaid'} · {t.workAllowed ? 'work allowed' : 'no work'}
              </span>
            )}
          </li>
        ))}
      </ul>
      {can.statutory ? (
        <div className="mt-3 w-44">
          <Select
            label="Week starts on"
            value={String(data.weekStartsOn)}
            onChange={(e) => weekMutation.mutate(Number(e.target.value) as 0 | 1)}
            options={[
              { value: '1', label: 'Monday' },
              { value: '0', label: 'Sunday' },
            ]}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-muted">Week starts on {WEEKDAY_NAMES[data.weekStartsOn]}.</p>
      )}
      <p className="mt-3 text-xs text-text-muted">Daily-paid workers are paid for a holiday only if its type is paid. Working a holiday is recorded as "Worked on holiday".</p>
    </Card>
  )
}

function WeeklyCard({ data, today = '', can, onDone, onFailed }: CardProps) {
  const [weekly, setWeekly] = useState({ category: 'factory' as 'factory' | 'office', weekdays: [0], half: '', effectiveFrom: today })
  const weeklyMutation = useMutation({
    mutationFn: () =>
      holidaysService.setWeeklyRule({
        category: weekly.category,
        weekdays: weekly.weekdays,
        halfDayWeekday: weekly.half === '' ? null : Number(weekly.half),
        effectiveFrom: weekly.effectiveFrom,
      }),
    onSuccess: (r) =>
      onDone(r.status === 'pending' ? 'Weekly holiday proposed — the Administrator approves it' : 'Weekly holiday saved — it applies from the date you chose'),
    onError: onFailed,
  })
  const ahead = data.weeklyRules.filter((r) => r.effectiveFrom > today)
  return (
    <Card>
      <CardTitle className="mb-2">Weekly holiday by category</CardTitle>
      {(['factory', 'office'] as const).map((c) => {
        const r = ruleInForce(data.weeklyRules, c, today)
        return (
          <p key={c} className="text-sm text-text">
            <span className="text-text-muted">{CATEGORY_LONG[c]}:</span>{' '}
            {r ? `${dayList(r.weekdays)}${r.halfDayWeekday !== null ? ` · half day ${WEEKDAY_NAMES[r.halfDayWeekday]}` : ''}` : '—'}
          </p>
        )
      })}
      {ahead.length > 0 && (
        <p className="mt-1 text-xs text-text-muted">Upcoming: {ahead.map((r) => `${r.category} ${dayList(r.weekdays)} from ${formatDate(r.effectiveFrom)}`).join(' · ')}</p>
      )}
      {can.calendar && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <Select
            label="Category"
            value={weekly.category}
            onChange={(e) => setWeekly({ ...weekly, category: e.target.value as 'factory' | 'office' })}
            options={[
              { value: 'factory', label: CATEGORY_LONG.factory },
              { value: 'office', label: CATEGORY_LONG.office },
            ]}
          />
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {WEEKDAY_NAMES.map((d, i) => (
              <Checkbox
                key={d}
                label={d.slice(0, 3)}
                checked={weekly.weekdays.includes(i)}
                onChange={(e) => setWeekly({ ...weekly, weekdays: e.target.checked ? [...weekly.weekdays, i] : weekly.weekdays.filter((x) => x !== i) })}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Half day"
              placeholder="None"
              value={weekly.half}
              onChange={(e) => setWeekly({ ...weekly, half: e.target.value })}
              options={WEEKDAY_NAMES.map((d, i) => ({ value: String(i), label: d }))}
            />
            <Input label="Effective from" type="date" min={today} value={weekly.effectiveFrom} onChange={(e) => setWeekly({ ...weekly, effectiveFrom: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => weeklyMutation.mutate()} loading={weeklyMutation.isPending}>
            {can.approver ? 'Save weekly holiday' : 'Propose weekly holiday'}
          </Button>
          <p className="text-xs text-text-muted">Past weeks keep the holiday they had.{!can.approver && ' The Administrator approves it before it applies.'}</p>
        </div>
      )}
    </Card>
  )
}

function RestDaysCard({ data, today = '', can, onDone, onFailed }: CardProps) {
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: employeesService.list, enabled: can.calendar })
  const [rest, setRest] = useState({ employeeId: '', weekday: '', effectiveFrom: today })
  const restMutation = useMutation({
    mutationFn: () => holidaysService.setRestDay(rest.employeeId, { weekday: rest.weekday === '' ? null : Number(rest.weekday), effectiveFrom: rest.effectiveFrom }),
    onSuccess: () => {
      onDone('Rest day saved')
      setRest({ employeeId: '', weekday: '', effectiveFrom: today })
    },
    onError: onFailed,
  })
  return (
    <Card>
      <CardTitle className="mb-2">Rest days (per employee)</CardTitle>
      {data.restDays.length === 0 ? (
        <p className="text-sm text-text-muted">Nobody has their own rest day — everyone follows their category.</p>
      ) : (
        <ul className="text-sm">
          {data.restDays.map((r) => (
            <li key={r.id} className="flex justify-between gap-2 py-0.5">
              <span>{r.employeeName}</span>
              <span className="text-text-muted">
                {r.weekday === null ? 'category rule' : WEEKDAY_NAMES[r.weekday]} from {formatDate(r.effectiveFrom)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {can.calendar && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <Combobox
            label="Employee"
            noun="employees"
            items={(employees ?? []).filter((e) => e.status === 'Active')}
            value={rest.employeeId}
            onChange={(id) => setRest({ ...rest, employeeId: id })}
            getKey={(e) => e.id}
            getLabel={(e) => e.name}
            getMeta={(e) => `${e.id} · ${e.role}`}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Rest day"
              placeholder="Category rule"
              value={rest.weekday}
              onChange={(e) => setRest({ ...rest, weekday: e.target.value })}
              options={WEEKDAY_NAMES.map((d, i) => ({ value: String(i), label: d }))}
            />
            <Input label="Effective from" type="date" min={today} value={rest.effectiveFrom} onChange={(e) => setRest({ ...rest, effectiveFrom: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => restMutation.mutate()} loading={restMutation.isPending} disabled={!rest.employeeId}>
            Save rest day
          </Button>
        </div>
      )}
    </Card>
  )
}
