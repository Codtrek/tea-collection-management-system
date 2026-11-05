import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import type { DeclarePreview, Holiday, HolidayRequest } from '@/features/employees/types'
import * as holidaysService from '@/services/holidays'
import { formatDate } from '@/lib/format'
import type { HolidayAbilities } from './SidePanel'

/*
  The holiday calendar's dialogs (Attendance-Leave-Addendum §4). Each is mounted only while open,
  so its form starts from its props every time; each owns its mutation and reports back with
  onDone / onFailed (the page refreshes the calendar).
*/

interface Done {
  onClose: () => void
  onDone: (msg: string) => void
  onFailed: (err: unknown) => void
}

/** Add or edit a Poya / public holiday (holidayStatutory). */
export function StatutoryHolidayModal({ holiday, date, onCopyLastYear, onClose, onDone, onFailed }: Done & { holiday: Holiday | null; date?: string; onCopyLastYear?: () => void }) {
  const [form, setForm] = useState({
    date: holiday?.date ?? date ?? '',
    name: holiday?.name ?? '',
    type: (holiday?.type === 'public' ? 'public' : 'poya') as 'poya' | 'public',
  })
  const save = useMutation({
    mutationFn: () => (holiday ? holidaysService.updateHoliday(holiday.id, form) : holidaysService.createHoliday(form)),
    onSuccess: () => {
      onDone(holiday ? 'Holiday updated' : 'Holiday added')
      onClose()
    },
    onError: onFailed,
  })
  return (
    <LightConfirmModal
      open
      onClose={onClose}
      onConfirm={() => save.mutate()}
      loading={save.isPending}
      confirmDisabled={!form.date || !form.name.trim()}
      title={holiday ? 'Edit holiday' : 'Add Poya or public holiday'}
      confirmLabel={holiday ? 'Save' : 'Add holiday'}
      message={<>Poya and public holidays apply to everyone. The government gazette is the official source.</>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as 'poya' | 'public' })}
          options={[
            { value: 'poya', label: 'Poya day' },
            { value: 'public', label: 'Public holiday' },
          ]}
        />
        <div className="sm:col-span-2">
          <Input label="Name" value={form.name} placeholder="e.g. Unduvap Full Moon Poya Day" onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
        </div>
      </div>
      {!holiday && onCopyLastYear && (
        <button type="button" className="mt-3 text-sm text-primary hover:underline" onClick={onCopyLastYear}>
          Or copy last year's names and set the dates
        </button>
      )}
    </LightConfirmModal>
  )
}

/** Last year's Poya / public names — set each new date (blank = skip). */
export function TemplateModal({ year, rows, onClose, onDone, onFailed }: Done & { year: number; rows: { name: string; type: 'poya' | 'public'; lastDate: string }[] }) {
  const [dates, setDates] = useState<string[]>(rows.map(() => ''))
  const save = useMutation({
    mutationFn: async () => {
      for (const [i, r] of rows.entries()) {
        if (dates[i]) await holidaysService.createHoliday({ date: dates[i], name: r.name, type: r.type })
      }
    },
    onSuccess: () => {
      onDone('Holidays added from last year')
      onClose()
    },
    onError: onFailed,
  })
  return (
    <LightConfirmModal
      open
      onClose={onClose}
      onConfirm={() => save.mutate()}
      loading={save.isPending}
      confirmDisabled={!dates.some(Boolean)}
      title={`${year} holidays from ${year - 1}'s names`}
      confirmLabel="Add these"
      message={<>Poya and public holiday dates change every year — set each date (leave blank to skip).</>}
    >
      <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {rows.map((r, i) => (
          <li key={`${r.name}-${i}`} className="grid grid-cols-[1fr_150px] items-end gap-2">
            <span className="text-sm text-text">
              {r.name}
              <span className="block text-xs text-text-muted">
                {r.type === 'poya' ? 'Poya' : 'Public'} · last year {formatDate(r.lastDate)}
              </span>
            </span>
            <Input
              aria-label={`${r.name} date`}
              type="date"
              value={dates[i]}
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              onChange={(e) => setDates((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
            />
          </li>
        ))}
      </ul>
    </LightConfirmModal>
  )
}

/**
 * Declare a holiday — a category holiday (one category), a factory closure (everyone; a
 * Manager's is a request) or a same-day emergency closure. The form first, then a preview of
 * the attendance and route days it touches.
 */
export function DeclareModal({
  initial,
  today,
  can,
  onClose,
  onDone,
  onFailed,
}: Done & { initial: holidaysService.DeclareInput; today: string; can: HolidayAbilities }) {
  const [declare, setDeclare] = useState(initial)
  const [preview, setPreview] = useState<DeclarePreview | null>(null)
  const edit = (patch: Partial<holidaysService.DeclareInput>) => {
    setDeclare({ ...declare, ...patch })
    setPreview(null)
  }
  const previewMutation = useMutation({ mutationFn: holidaysService.previewDeclare, onSuccess: setPreview, onError: onFailed })
  const declareMutation = useMutation({
    mutationFn: holidaysService.declareHoliday,
    onSuccess: (r) => {
      onDone(
        r.status === 'pending'
          ? 'Closure requested — it takes effect when the Administrator approves it'
          : r.status === 'review'
            ? 'Emergency closure in force — the Administrator reviews it'
            : 'Holiday declared',
      )
      onClose()
    },
    onError: onFailed,
  })
  const factoryWide = declare.appliesTo === 'all'
  const asRequest = factoryWide && !can.approver && !declare.emergency
  return (
    <LightConfirmModal
      open
      onClose={onClose}
      onConfirm={() => (preview ? declareMutation.mutate(declare) : previewMutation.mutate(declare))}
      loading={previewMutation.isPending || declareMutation.isPending}
      confirmDisabled={
        !declare.name.trim() || !declare.reason.trim() || declare.to < declare.from || (!!preview && preview.attendance.length > 0 && !declare.attendance)
      }
      title={preview ? 'Confirm the holiday' : factoryWide ? 'Declare factory closure' : 'Add category holiday'}
      confirmLabel={preview ? (asRequest ? 'Send for approval' : 'Declare holiday') : 'Check what it affects'}
      message={
        preview ? (
          <>
            {preview.dates.length} day{preview.dates.length === 1 ? '' : 's'} become non-working
            {declare.collectionStops
              ? `; ${preview.routeDays.length} route collection day(s) are cancelled and their fertilizer deliveries move to each route's next collection day`
              : '; tea collection continues'}
            .{asRequest && ' Nothing changes until the Administrator approves it.'}
          </>
        ) : factoryWide ? (
          <>A closure for all employees — a government announcement, a flood, a power failure or a factory decision.</>
        ) : (
          <>A holiday for factory workers or office staff only.</>
        )
      }
    >
      {!preview ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="From" type="date" value={declare.from} disabled={declare.emergency} onChange={(e) => edit({ from: e.target.value })} />
          <Input label="To" type="date" value={declare.to} min={declare.from} disabled={declare.emergency} onChange={(e) => edit({ to: e.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Name" value={declare.name} placeholder={factoryWide ? 'e.g. Flood closure' : 'e.g. Office staff outing'} onChange={(e) => edit({ name: e.target.value })} maxLength={100} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Reason" value={declare.reason} onChange={(e) => edit({ reason: e.target.value })} maxLength={300} />
          </div>
          <Select
            label="Applies to"
            value={declare.appliesTo}
            onChange={(e) => edit({ appliesTo: e.target.value as holidaysService.DeclareInput['appliesTo'], emergency: false })}
            options={[
              { value: 'all', label: 'All employees' },
              { value: 'factory', label: 'Factory workers' },
              { value: 'office', label: 'Office staff' },
            ]}
          />
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Checkbox label="Paid" checked={declare.paid} onChange={(e) => edit({ paid: e.target.checked })} />
            <Checkbox label="Tea collection stops these days" checked={declare.collectionStops} onChange={(e) => edit({ collectionStops: e.target.checked })} />
          </div>
          {factoryWide && !can.approver && (
            <div className="sm:col-span-2">
              <Checkbox
                label="Emergency — today only, takes effect now (the Administrator reviews it after)"
                checked={!!declare.emergency}
                onChange={(e) => edit({ emergency: e.target.checked, ...(e.target.checked ? { from: today, to: today } : {}) })}
              />
              {!declare.emergency && <p className="mt-1 text-xs text-text-muted">A closure for all employees goes to the Administrator for approval first.</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          {preview.attendance.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-text">Attendance already marked on those dates ({preview.attendance.length})</p>
              <ul className="mb-2 max-h-32 overflow-y-auto text-xs text-text-muted">
                {preview.attendance.map((a) => (
                  <li key={`${a.employeeId}-${a.date}`}>
                    {formatDate(a.date)} · {a.name} — {a.status}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2" role="radiogroup" aria-label="Already-marked attendance">
                {(['keep', 'clear'] as const).map((o) => (
                  <Button key={o} size="sm" variant={declare.attendance === o ? 'primary' : 'secondary'} onClick={() => setDeclare({ ...declare, attendance: o })}>
                    {o === 'keep' ? 'Keep as "Worked on holiday"' : 'Clear them'}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {preview.routeDays.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-text">Route days cancelled</p>
              <ul className="max-h-32 overflow-y-auto text-xs text-text-muted">
                {preview.routeDays.map((r) => (
                  <li key={`${r.routeId}-${r.date}`}>
                    {formatDate(r.date)} · {r.routeName}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-text-muted">The agents are told in the app.</p>
            </div>
          )}
          {preview.attendance.length === 0 && preview.routeDays.length === 0 && <p className="text-text-muted">Nothing already marked or scheduled is affected.</p>}
          <button type="button" className="self-start text-xs text-primary hover:underline" onClick={() => setPreview(null)}>
            Back to the form
          </button>
        </div>
      )}
    </LightConfirmModal>
  )
}

/** Delete (cancel) a holiday — it stays in the history as cancelled. */
export function CancelHolidayModal({ holiday, today, onClose, onDone, onFailed }: Done & { holiday: Holiday; today: string }) {
  const [reason, setReason] = useState('')
  const started = holiday.date <= today
  const cancel = useMutation({
    mutationFn: () =>
      holiday.declareGroup ? holidaysService.cancelDeclared(holiday.declareGroup, reason.trim() || undefined) : holidaysService.cancelHoliday(holiday.id, reason.trim() || undefined),
    onSuccess: () => {
      onDone('Holiday deleted')
      onClose()
    },
    onError: onFailed,
  })
  return (
    <LightConfirmModal
      open
      onClose={onClose}
      onConfirm={() => cancel.mutate()}
      loading={cancel.isPending}
      confirmDisabled={started && !reason.trim()}
      tone="danger"
      title={`Delete "${holiday.name}"`}
      confirmLabel="Delete holiday"
      message={
        holiday.declareGroup ? (
          <>This cancels the whole declared holiday and puts back any route days it cancelled that are still ahead. It stays in the history as cancelled.</>
        ) : (
          <>The day becomes a normal working day again. It stays in the history as cancelled.</>
        )
      }
    >
      <Input label={started ? 'Reason (required — it has started)' : 'Reason (optional)'} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
    </LightConfirmModal>
  )
}

/** The Administrator's approve / reject — keep / revert for an emergency closure. A reason is required. */
export function DecideModal({ request, decision, onClose, onDone, onFailed }: Done & { request: HolidayRequest; decision: 'approve' | 'reject' }) {
  const [reason, setReason] = useState('')
  const emergency = request.kind === 'emergency'
  const label = emergency ? (decision === 'approve' ? 'Keep' : 'Revert') : decision === 'approve' ? 'Approve' : 'Reject'
  const decide = useMutation({
    mutationFn: () => holidaysService.decideRequest(request.id, decision, reason.trim()),
    onSuccess: () => {
      onDone(`${label}: ${request.name}`)
      onClose()
    },
    onError: onFailed,
  })
  return (
    <LightConfirmModal
      open
      onClose={onClose}
      onConfirm={() => decide.mutate()}
      loading={decide.isPending}
      confirmDisabled={!reason.trim()}
      tone={decision === 'reject' ? 'danger' : 'default'}
      title={`${label} — ${request.name}`}
      confirmLabel={label}
      message={
        emergency && decision === 'reject' ? (
          <>The closure is cancelled, its route days come back, attendance is put back as it was and the agents are told collection is on.</>
        ) : decision === 'approve' && !emergency ? (
          <>It takes effect now: {request.summary}.</>
        ) : (
          <>{request.requestedBy} is told, and the decision is audited.</>
        )
      }
    >
      <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
    </LightConfirmModal>
  )
}
