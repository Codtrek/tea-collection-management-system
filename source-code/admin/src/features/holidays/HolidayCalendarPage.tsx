import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, ChevronLeft, ChevronRight, DoorClosed, Loader2, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import type { Holiday, HolidayRequest } from '@/features/employees/types'
import * as holidaysService from '@/services/holidays'
import { periodOf } from '@/lib/month'
import { cn } from '@/lib/cn'
import { calendarParams, readCalendarParams, shiftMonth, type CalendarParams } from './calendar-model'
import { CATEGORY_LABEL } from './holiday-style'
import { MonthGrid } from './MonthGrid'
import { YearView } from './YearView'
import { HolidayListView } from './HolidayListView'
import { DayDrawer } from './DayDrawer'
import { SidePanel, type HolidayAbilities } from './SidePanel'
import { CancelHolidayModal, DecideModal, DeclareModal, StatutoryHolidayModal, TemplateModal } from './HolidayModals'

type Dialog =
  | { kind: 'statutory'; holiday: Holiday | null; date?: string }
  | { kind: 'template'; rows: { name: string; type: 'poya' | 'public'; lastDate: string }[] }
  | { kind: 'declare'; initial: holidaysService.DeclareInput }
  | { kind: 'cancel'; holiday: Holiday }
  | { kind: 'decide'; request: HolidayRequest; decision: 'approve' | 'reject' }

/*
  Holiday Calendar (Attendance-Leave-Addendum §4.4). Month (default) / Year / List views; the
  month, view, "Show for" category and the open day live in the URL (`?month=YYYY-MM&view=&show=
  &day=`). Buttons follow the permission matrix (§4.1): Poya / public holidays, type settings
  and the import are `holidayStatutory: edit`; category holidays, rest days and closures are
  `holidayCalendar: edit` (a Manager's factory-wide closure and weekly holiday are requests);
  approvals are `holidayCalendar: approve`. The server decides every change regardless.
*/
export function HolidayCalendarPage() {
  const { toast } = useToast()
  const { can: allowed } = useAuth()
  const can: HolidayAbilities = {
    statutory: allowed('holidayStatutory', 'edit'),
    calendar: allowed('holidayCalendar', 'edit'),
    approver: allowed('holidayCalendar', 'approve'),
  }
  const queryClient = useQueryClient()
  const today = factoryToday()
  const [searchParams, setSearchParams] = useSearchParams()
  const p = readCalendarParams(searchParams, today)
  const set = (patch: Partial<CalendarParams>) => setSearchParams(calendarParams({ ...p, ...patch }, today), { replace: true })
  const year = Number(p.month.slice(0, 4))

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => holidaysService.getYear(year),
    placeholderData: keepPreviousData,
  })
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const done = (msg: string) => {
    toast(msg)
    void queryClient.invalidateQueries({ queryKey: ['holidays'] })
    void queryClient.invalidateQueries({ queryKey: ['employees', 'attendance'] })
  }
  const failed = (err: unknown) => toast(err instanceof Error ? err.message : 'Could not save this', 'danger')
  const close = () => setDialog(null)

  const copyLastYear = async () => {
    try {
      const rows = await holidaysService.getTemplate(year - 1)
      if (rows.length === 0) toast(`No ${year - 1} holidays to copy`, 'warning')
      else setDialog({ kind: 'template', rows })
    } catch (err) {
      failed(err)
    }
  }
  const declareForm = (appliesTo: holidaysService.DeclareInput['appliesTo']): Dialog => ({
    kind: 'declare',
    initial: { from: today, to: today, name: '', reason: '', paid: false, appliesTo, collectionStops: appliesTo === 'all', emergency: false },
  })

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

  const step = p.view === 'year' ? 12 : 1
  const heading = p.view === 'month' ? periodOf(p.month) : String(year)

  return (
    <div>
      <PageHeader
        title="Holiday Calendar"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Holiday Calendar' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!can.calendar && !can.statutory && <StatusBadge tone="neutral">View only</StatusBadge>}
            {(can.statutory || can.calendar) && (
              <Button
                variant="secondary"
                onClick={() => setDialog(can.statutory ? { kind: 'statutory', holiday: null } : declareForm('factory'))}
              >
                <CalendarPlus className="size-4" /> Add holiday
              </Button>
            )}
            {can.calendar && (
              <Button onClick={() => setDialog(declareForm('all'))}>
                <DoorClosed className="size-4" /> Declare factory closure
              </Button>
            )}
          </div>
        }
      />

      {data.nextYearMissing && can.statutory && (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg/60 p-3 text-sm text-text">
          <TriangleAlert className="size-4 text-warning-fg" aria-hidden />
          {data.nextYear}'s Poya and public holidays haven't been entered yet.
          <button type="button" className="text-primary hover:underline" onClick={() => set({ month: `${data.nextYear}-01`, view: 'list' })}>
            Go to {data.nextYear}
          </button>
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="min-w-0 self-start p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-1">
              <Button variant="ghost" size="sm" aria-label={p.view === 'month' ? 'Previous month' : 'Previous year'} onClick={() => set({ month: shiftMonth(p.month, -step) })}>
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="min-w-36 text-center text-base font-semibold text-text-heading">{heading}</h2>
              <Button variant="ghost" size="sm" aria-label={p.view === 'month' ? 'Next month' : 'Next year'} onClick={() => set({ month: shiftMonth(p.month, step) })}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" className="ml-1" onClick={() => set({ month: today.slice(0, 7) })} disabled={p.month === today.slice(0, 7)}>
                Today
              </Button>
              {isFetching && <Loader2 className="ml-2 size-4 animate-spin text-text-muted" aria-label="Updating" />}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {p.view !== 'list' && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted" role="radiogroup" aria-label="Show weekly holidays for">
                  Show for:
                  {(['factory', 'office'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={p.show === c}
                      onClick={() => set({ show: c })}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        p.show === c ? 'bg-brand-soft text-primary' : 'text-text-muted hover:bg-surface-hover',
                      )}
                    >
                      {CATEGORY_LABEL[c]}
                    </button>
                  ))}
                </div>
              )}
              <Tabs
                tabs={[
                  { id: 'month', label: 'Month' },
                  { id: 'year', label: 'Year' },
                  { id: 'list', label: 'List' },
                ]}
                active={p.view}
                onChange={(v) => set({ view: v as CalendarParams['view'] })}
              />
            </div>
          </div>

          {p.view === 'year' && (
            <p className="border-b border-border px-4 py-2 text-xs text-text-muted">
              {year}: {data.counts.poya} Poya · {data.counts.public} public · {data.counts.closure} closure{data.counts.closure === 1 ? '' : 's'}
            </p>
          )}

          {p.view === 'month' ? (
            <MonthGrid
              month={p.month}
              today={today}
              weekStartsOn={data.weekStartsOn}
              show={p.show}
              holidays={data.holidays}
              pending={data.pending}
              weeklyRules={data.weeklyRules}
              onOpenDay={(day) => set({ day })}
            />
          ) : p.view === 'year' ? (
            <YearView data={data} today={today} show={p.show} onOpenMonth={(m) => set({ month: m, view: 'month' })} onOpenDay={(day) => set({ day })} />
          ) : (
            <HolidayListView
              year={year}
              holidays={data.holidays}
              onOpenDay={(day) => set({ day })}
              onEdit={(h) => setDialog({ kind: 'statutory', holiday: h })}
              onCancel={(h) => setDialog({ kind: 'cancel', holiday: h })}
            />
          )}
          {p.view === 'list' && can.statutory && (
            <div className="border-t border-border px-4 py-3 print:hidden">
              <Button variant="ghost" size="sm" onClick={() => void copyLastYear()}>
                Copy {year - 1}'s names
              </Button>
            </div>
          )}
        </Card>

        <SidePanel
          data={data}
          today={today}
          can={can}
          onDone={done}
          onFailed={failed}
          onOpenDay={(day) => set({ day, month: day.slice(0, 7) })}
          onDecide={(request, decision) => setDialog({ kind: 'decide', request, decision })}
        />
      </div>

      <DayDrawer
        date={p.day}
        onClose={() => set({ day: null })}
        onEdit={(h) => setDialog({ kind: 'statutory', holiday: h })}
        onCancel={(h) => setDialog({ kind: 'cancel', holiday: h })}
      />

      {dialog?.kind === 'statutory' && (
        <StatutoryHolidayModal
          holiday={dialog.holiday}
          date={dialog.date}
          onCopyLastYear={() => void copyLastYear()}
          onClose={close}
          onDone={done}
          onFailed={failed}
        />
      )}
      {dialog?.kind === 'template' && <TemplateModal year={year} rows={dialog.rows} onClose={close} onDone={done} onFailed={failed} />}
      {dialog?.kind === 'declare' && <DeclareModal initial={dialog.initial} today={today} can={can} onClose={close} onDone={done} onFailed={failed} />}
      {dialog?.kind === 'cancel' && <CancelHolidayModal holiday={dialog.holiday} today={today} onClose={close} onDone={done} onFailed={failed} />}
      {dialog?.kind === 'decide' && <DecideModal request={dialog.request} decision={dialog.decision} onClose={close} onDone={done} onFailed={failed} />}
    </div>
  )
}
