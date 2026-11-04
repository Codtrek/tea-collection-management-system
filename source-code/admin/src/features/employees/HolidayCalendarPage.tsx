import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, ChevronLeft, ChevronRight, Copy, Loader2, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Combobox } from '@/components/ui/Combobox'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import * as holidaysService from '@/services/holidays'
import * as employeesService from '@/services/employees'
import { formatDate } from '@/lib/format'
import type { DeclarePreview, Holiday } from './types'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CATEGORY_LABEL = { factory: 'Factory workers (Wages Board)', office: 'Office staff (Shop & Office Act)' } as const
const TYPE_LABEL: Record<Holiday['type'], string> = { poya: 'Poya', public: 'Public', closure: 'Closure' }

type DeclareForm = holidaysService.DeclareInput

/*
  Holiday Calendar (Attendance-Leave-Addendum §Holidays). Poya / public holidays are entered per
  year (copy last year's names, then set the dates — nothing is scraped); paid / work-allowed per
  type; the weekly holiday per category from an effective date; per-employee rest days; and
  "Declare holiday" for sudden closures (preview first). Only `holidayCalendar: edit` (the Factory
  Manager) can change anything — the server enforces it too. Everyone with `view` can read it.
*/
export function HolidayCalendarPage() {
  const { toast } = useToast()
  const { can } = useAuth()
  const canEdit = can('holidayCalendar', 'edit')
  const queryClient = useQueryClient()
  const today = factoryToday()
  const [year, setYear] = useState(Number(today.slice(0, 4)))

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => holidaysService.getYear(year),
  })
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: employeesService.list, enabled: canEdit })

  const done = (msg: string) => {
    toast(msg)
    void queryClient.invalidateQueries({ queryKey: ['holidays'] })
    void queryClient.invalidateQueries({ queryKey: ['employees', 'attendance'] })
  }
  const failed = (err: unknown) => toast(err instanceof Error ? err.message : 'Could not save this', 'danger')

  // new / edit holiday
  const blank = { date: '', name: '', type: 'poya' as 'poya' | 'public' }
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<number | null>(null)
  const saveHoliday = useMutation({
    mutationFn: () => (editing ? holidaysService.updateHoliday(editing, form) : holidaysService.createHoliday(form)),
    onSuccess: () => {
      done(editing ? 'Holiday updated' : 'Holiday added')
      setForm(blank)
      setEditing(null)
    },
    onError: failed,
  })
  const [cancelling, setCancelling] = useState<Holiday | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const cancelMutation = useMutation({
    mutationFn: (h: Holiday) =>
      h.declareGroup ? holidaysService.cancelDeclared(h.declareGroup, cancelReason.trim() || undefined) : holidaysService.cancelHoliday(h.id, cancelReason.trim() || undefined),
    onSuccess: () => {
      done('Holiday cancelled')
      setCancelling(null)
    },
    onError: failed,
  })

  // copy last year's names
  const [template, setTemplate] = useState<{ name: string; type: 'poya' | 'public'; lastDate: string; date: string }[] | null>(null)
  const loadTemplate = async () => {
    try {
      const rows = await holidaysService.getTemplate(year - 1)
      if (rows.length === 0) toast(`No ${year - 1} holidays to copy`, 'warning')
      else setTemplate(rows.map((r) => ({ ...r, date: '' })))
    } catch (err) {
      failed(err)
    }
  }
  const saveTemplate = useMutation({
    mutationFn: async () => {
      for (const t of (template ?? []).filter((x) => x.date)) {
        await holidaysService.createHoliday({ date: t.date, name: t.name, type: t.type })
      }
    },
    onSuccess: () => {
      done('Holidays added from last year')
      setTemplate(null)
    },
    onError: failed,
  })

  // weekly rule / rest day / types
  const [weekly, setWeekly] = useState({ category: 'factory' as 'factory' | 'office', weekdays: [0], half: '', effectiveFrom: today })
  const weeklyMutation = useMutation({
    mutationFn: () =>
      holidaysService.setWeeklyRule({
        category: weekly.category,
        weekdays: weekly.weekdays,
        halfDayWeekday: weekly.half === '' ? null : Number(weekly.half),
        effectiveFrom: weekly.effectiveFrom,
      }),
    onSuccess: () => done('Weekly holiday saved — it applies from the date you chose'),
    onError: failed,
  })
  const [rest, setRest] = useState({ employeeId: '', weekday: '', effectiveFrom: today })
  const restMutation = useMutation({
    mutationFn: () => holidaysService.setRestDay(rest.employeeId, { weekday: rest.weekday === '' ? null : Number(rest.weekday), effectiveFrom: rest.effectiveFrom }),
    onSuccess: () => {
      done('Rest day saved')
      setRest({ employeeId: '', weekday: '', effectiveFrom: today })
    },
    onError: failed,
  })
  const typeMutation = useMutation({
    mutationFn: (v: { type: string; paid: boolean; workAllowed: boolean }) => holidaysService.updateType(v.type, v),
    onSuccess: () => done('Holiday type updated'),
    onError: failed,
  })

  // declare
  const [declare, setDeclare] = useState<DeclareForm | null>(null)
  const [preview, setPreview] = useState<DeclarePreview | null>(null)
  const previewMutation = useMutation({
    mutationFn: (f: DeclareForm) => holidaysService.previewDeclare(f),
    onSuccess: setPreview,
    onError: failed,
  })
  const declareMutation = useMutation({
    mutationFn: (f: DeclareForm) => holidaysService.declareHoliday(f),
    onSuccess: () => {
      done('Holiday declared')
      setDeclare(null)
      setPreview(null)
    },
    onError: failed,
  })
  const openDeclare = () =>
    setDeclare({ from: today, to: today, name: '', reason: '', paid: false, appliesTo: 'all', collectionStops: true })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Couldn't load the holiday calendar" description="Something went wrong." onRetry={() => void refetch()} />
  }

  const current = (c: 'factory' | 'office') =>
    data.weeklyRules.filter((r) => r.category === c && r.effectiveFrom <= today).at(-1)

  return (
    <div>
      <PageHeader
        title="Holiday Calendar"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Holiday Calendar' }]}
        actions={
          canEdit ? (
            <Button onClick={openDeclare}>
              <CalendarPlus className="size-4" /> Declare holiday
            </Button>
          ) : undefined
        }
      />

      {data.nextYearMissing && (
        <p className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg/60 p-3 text-sm text-text">
          <TriangleAlert className="size-4 text-warning-fg" aria-hidden />
          {data.nextYear}'s Poya and public holidays haven't been entered yet.
          {canEdit && (
            <button type="button" className="text-primary hover:underline" onClick={() => setYear(data.nextYear)}>
              Enter them now
            </button>
          )}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="p-0">
          <CardHeader className="px-5 pt-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" aria-label="Previous year" onClick={() => setYear(year - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <CardTitle>{year} holidays</CardTitle>
              <Button variant="ghost" size="sm" aria-label="Next year" onClick={() => setYear(year + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => void loadTemplate()}>
                <Copy className="size-4" /> Copy {year - 1} names
              </Button>
            )}
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-[11px] uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-5 py-2 text-left">Date</th>
                  <th className="px-5 py-2 text-left">Name</th>
                  <th className="px-5 py-2 text-left">Type</th>
                  <th className="px-5 py-2 text-left">Paid · Work</th>
                  <th className="px-5 py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {data.holidays.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-text-muted">
                      No holidays entered for {year}.
                    </td>
                  </tr>
                )}
                {data.holidays.map((h) => (
                  <tr key={h.id} className={`border-t border-border ${h.cancelled ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-2 whitespace-nowrap">{formatDate(h.date)}</td>
                    <td className="px-5 py-2">
                      {h.name}
                      {h.reason && <span className="block text-xs text-text-muted">{h.reason}</span>}
                      {h.cancelled && <span className="block text-xs text-danger-fg">Cancelled{h.cancelReason ? ` — ${h.cancelReason}` : ''}</span>}
                    </td>
                    <td className="px-5 py-2">
                      <StatusBadge tone={h.type === 'closure' ? 'warning' : 'assigned'}>{TYPE_LABEL[h.type]}</StatusBadge>
                      {h.appliesTo !== 'all' && <span className="block text-xs text-text-muted">{h.appliesTo === 'office' ? 'Office staff only' : 'Factory workers only'}</span>}
                    </td>
                    <td className="px-5 py-2 text-xs text-text-muted">
                      {h.paid ? 'Paid' : 'Unpaid'} · {h.workAllowed ? 'work allowed' : 'no work'}
                      {h.collectionStops && <span className="block">collection stopped</span>}
                    </td>
                    <td className="px-5 py-2 text-right">
                      {canEdit && !h.cancelled && (
                        <div className="flex justify-end gap-1">
                          {h.type !== 'closure' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(h.id)
                                setForm({ date: h.date, name: h.name, type: h.type as 'poya' | 'public' })
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCancelling(h)
                              setCancelReason('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2 border-t border-border px-5 py-3">
              <div className="w-40">
                <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="min-w-48 flex-1">
                <Input label="Name" value={form.name} placeholder="e.g. Unduvap Full Moon Poya" onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="w-36">
                <Select
                  label="Type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'poya' | 'public' })}
                  options={[
                    { value: 'poya', label: 'Poya day' },
                    { value: 'public', label: 'Public holiday' },
                  ]}
                />
              </div>
              <Button onClick={() => saveHoliday.mutate()} loading={saveHoliday.isPending} disabled={!form.date || !form.name.trim()}>
                {editing ? 'Save' : 'Add'}
              </Button>
              {editing && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(null)
                    setForm(blank)
                  }}
                >
                  Cancel edit
                </Button>
              )}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle className="mb-3">Holiday types</CardTitle>
            <ul className="flex flex-col gap-3 text-sm">
              {data.types.map((t) => (
                <li key={t.type} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-text">{t.label}</span>
                  <span className="flex gap-3">
                    <Checkbox
                      label="Paid"
                      checked={t.paid}
                      disabled={!canEdit || typeMutation.isPending}
                      onChange={(e) => typeMutation.mutate({ type: t.type, paid: e.target.checked, workAllowed: t.workAllowed })}
                    />
                    <Checkbox
                      label="Work allowed"
                      checked={t.workAllowed}
                      disabled={!canEdit || typeMutation.isPending}
                      onChange={(e) => typeMutation.mutate({ type: t.type, paid: t.paid, workAllowed: e.target.checked })}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-text-muted">Daily-paid workers are paid for a holiday only if its type is paid. Working a holiday is recorded as "Worked on holiday".</p>
          </Card>

          <Card>
            <CardTitle className="mb-2">Weekly holiday</CardTitle>
            {(['factory', 'office'] as const).map((c) => {
              const r = current(c)
              return (
                <p key={c} className="text-sm text-text">
                  <span className="text-text-muted">{CATEGORY_LABEL[c]}:</span>{' '}
                  {r ? `${r.weekdays.map((d) => WEEKDAYS[d]).join(', ') || 'none'}${r.halfDayWeekday !== null ? ` · half day ${WEEKDAYS[r.halfDayWeekday]}` : ''}` : '—'}
                </p>
              )
            })}
            {data.weeklyRules.some((r) => r.effectiveFrom > today) && (
              <p className="mt-1 text-xs text-text-muted">
                Upcoming:{' '}
                {data.weeklyRules
                  .filter((r) => r.effectiveFrom > today)
                  .map((r) => `${r.category} from ${formatDate(r.effectiveFrom)}`)
                  .join(' · ')}
              </p>
            )}
            {canEdit && (
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <Select
                  label="Category"
                  value={weekly.category}
                  onChange={(e) => setWeekly({ ...weekly, category: e.target.value as 'factory' | 'office' })}
                  options={[
                    { value: 'factory', label: CATEGORY_LABEL.factory },
                    { value: 'office', label: CATEGORY_LABEL.office },
                  ]}
                />
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {WEEKDAYS.map((d, i) => (
                    <Checkbox
                      key={d}
                      label={d.slice(0, 3)}
                      checked={weekly.weekdays.includes(i)}
                      onChange={(e) =>
                        setWeekly({ ...weekly, weekdays: e.target.checked ? [...weekly.weekdays, i] : weekly.weekdays.filter((x) => x !== i) })
                      }
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Half day"
                    placeholder="None"
                    value={weekly.half}
                    onChange={(e) => setWeekly({ ...weekly, half: e.target.value })}
                    options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
                  />
                  <Input label="Effective from" type="date" min={today} value={weekly.effectiveFrom} onChange={(e) => setWeekly({ ...weekly, effectiveFrom: e.target.value })} />
                </div>
                <Button size="sm" onClick={() => weeklyMutation.mutate()} loading={weeklyMutation.isPending}>
                  Save weekly holiday
                </Button>
                <p className="text-xs text-text-muted">Past weeks keep the holiday they had.</p>
              </div>
            )}
          </Card>

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
                      {r.weekday === null ? 'category rule' : WEEKDAYS[r.weekday]} from {formatDate(r.effectiveFrom)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (
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
                    options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
                  />
                  <Input label="Effective from" type="date" min={today} value={rest.effectiveFrom} onChange={(e) => setRest({ ...rest, effectiveFrom: e.target.value })} />
                </div>
                <Button size="sm" onClick={() => restMutation.mutate()} loading={restMutation.isPending} disabled={!rest.employeeId}>
                  Save rest day
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* copy last year's names: fill in the dates */}
      <LightConfirmModal
        open={!!template}
        onClose={() => setTemplate(null)}
        onConfirm={() => saveTemplate.mutate()}
        loading={saveTemplate.isPending}
        confirmDisabled={!template?.some((t) => t.date)}
        title={`${year} holidays from ${year - 1}'s names`}
        confirmLabel="Add these"
        message={<>Poya and public holiday dates change every year — set each date (leave blank to skip).</>}
      >
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {(template ?? []).map((t, i) => (
            <li key={`${t.name}-${i}`} className="grid grid-cols-[1fr_150px] items-end gap-2">
              <span className="text-sm text-text">
                {t.name}
                <span className="block text-xs text-text-muted">
                  {TYPE_LABEL[t.type]} · last year {formatDate(t.lastDate)}
                </span>
              </span>
              <Input
                aria-label={`${t.name} date`}
                type="date"
                value={t.date}
                min={`${year}-01-01`}
                max={`${year}-12-31`}
                onChange={(e) => setTemplate((all) => (all ?? []).map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))}
              />
            </li>
          ))}
        </ul>
      </LightConfirmModal>

      <LightConfirmModal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelling && cancelMutation.mutate(cancelling)}
        loading={cancelMutation.isPending}
        confirmDisabled={!!cancelling && cancelling.date <= today && !cancelReason.trim()}
        tone="danger"
        title="Cancel this holiday"
        confirmLabel="Cancel holiday"
        message={
          cancelling?.declareGroup ? (
            <>This cancels the whole declared holiday and puts back any route days it cancelled that are still ahead.</>
          ) : (
            <>The day becomes a normal working day again.</>
          )
        }
      >
        <Input
          label={cancelling && cancelling.date <= today ? 'Reason (required — it has started)' : 'Reason (optional)'}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          maxLength={300}
        />
      </LightConfirmModal>

      {/* declare: the form, then a preview of what it touches */}
      <LightConfirmModal
        open={!!declare}
        onClose={() => {
          setDeclare(null)
          setPreview(null)
        }}
        onConfirm={() => {
          if (!declare) return
          if (!preview) previewMutation.mutate(declare)
          else declareMutation.mutate(declare)
        }}
        loading={previewMutation.isPending || declareMutation.isPending}
        confirmDisabled={
          !declare ||
          !declare.name.trim() ||
          !declare.reason.trim() ||
          declare.to < declare.from ||
          (!!preview && preview.attendance.length > 0 && !declare.attendance)
        }
        title={preview ? 'Confirm the holiday' : 'Declare holiday'}
        confirmLabel={preview ? 'Declare holiday' : 'Check what it affects'}
        message={
          preview ? (
            <>
              {preview.dates.length} day{preview.dates.length === 1 ? '' : 's'} become non-working
              {declare?.collectionStops ? `; ${preview.routeDays.length} route collection day(s) are cancelled and their fertilizer deliveries move to each route's next collection day` : '; tea collection continues'}
              .
            </>
          ) : (
            <>A sudden holiday or closure — a government announcement, a flood, a power failure or a factory decision.</>
          )
        }
      >
        {declare && !preview && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="From" type="date" value={declare.from} onChange={(e) => setDeclare({ ...declare, from: e.target.value })} />
            <Input label="To" type="date" value={declare.to} min={declare.from} onChange={(e) => setDeclare({ ...declare, to: e.target.value })} />
            <div className="sm:col-span-2">
              <Input label="Name" value={declare.name} placeholder="e.g. Flood closure" onChange={(e) => setDeclare({ ...declare, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Reason" value={declare.reason} onChange={(e) => setDeclare({ ...declare, reason: e.target.value })} maxLength={300} />
            </div>
            <Select
              label="Applies to"
              value={declare.appliesTo}
              onChange={(e) => setDeclare({ ...declare, appliesTo: e.target.value as DeclareForm['appliesTo'] })}
              options={[
                { value: 'all', label: 'All employees' },
                { value: 'factory', label: 'Factory workers' },
                { value: 'office', label: 'Office staff' },
              ]}
            />
            <div className="flex flex-col justify-end gap-2 pb-1">
              <Checkbox label="Paid" checked={declare.paid} onChange={(e) => setDeclare({ ...declare, paid: e.target.checked })} />
              <Checkbox
                label="Tea collection stops these days"
                checked={declare.collectionStops}
                onChange={(e) => setDeclare({ ...declare, collectionStops: e.target.checked })}
              />
            </div>
          </div>
        )}
        {declare && preview && (
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
          </div>
        )}
      </LightConfirmModal>
    </div>
  )
}
