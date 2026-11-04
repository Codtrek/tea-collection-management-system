import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Lock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import * as employeesService from '@/services/employees'
import { formatDate, initials } from '@/lib/format'
import { cn } from '@/lib/cn'
import {
  changedRecords,
  isNonWorking,
  markAllPresent,
  markProblem,
  savedMarks,
  unmarkedCount,
  type EntryMark,
} from './attendance-view'
import type { AttendanceDayRow, AttendanceStatus } from './types'

const WORKING: AttendanceStatus[] = ['Present', 'Absent', 'Half-day', 'Short leave', 'Leave']
const optionClass: Record<AttendanceStatus, string> = {
  Present: 'bg-success-bg text-success-fg',
  Absent: 'bg-danger-bg text-danger-fg',
  Leave: 'bg-warning-bg text-warning-fg',
  'Half-day': 'bg-brand-soft text-primary',
  'Short leave': 'bg-approved-bg text-approved-fg',
}

/*
  EMP-08 Daily Attendance Entry (Attendance-Leave-Addendum Phase 1). The date is in the URL
  (default today; never the future). It loads what's saved for the date — nobody defaults to
  Present; only "Mark All Present" sets everyone (skipping leave, locked rows and holidays).
  Save waits until every row has a status, or asks "N not marked. Save anyway?". Days older than
  the edit window need the Factory Manager and a reason. All of it is enforced server-side too.
*/
export function AttendanceEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const today = factoryToday()
  const [params, setParams] = useSearchParams()
  const requested = params.get('date')
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= today ? requested : today

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['employees', 'attendance', 'day', date],
    queryFn: () => employeesService.getAttendanceDay(date),
  })

  // edits on top of what's saved, per date (a new date starts from its own saved marks)
  const [edits, setEdits] = useState<{ date: string; marks: Record<string, EntryMark> } | null>(null)
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const rows = data?.rows ?? []
  const marks = edits?.date === date ? edits.marks : savedMarks(rows)
  const setMarks = (next: Record<string, EntryMark>) => setEdits({ date, marks: next })
  const setMark = (id: string, m: EntryMark | undefined) => {
    const next = { ...marks }
    if (m) next[id] = m
    else delete next[id]
    setMarks(next)
  }

  const records = changedRecords(rows, marks)
  const unmarked = unmarkedCount(rows, marks)
  const problems = Object.entries(marks)
    .map(([id, m]) => [id, markProblem(m)] as const)
    .filter(([, p]) => p)
  const needsReason = !!data?.needsReason
  const managerOnly = needsReason && !can('attendance', 'approve')

  const saveMutation = useMutation({
    mutationFn: () => employeesService.markAttendance({ date, records, reason: needsReason ? reason.trim() : undefined }),
    onSuccess: () => {
      toast(`Attendance saved for ${formatDate(date)}`)
      setEdits(null)
      setConfirming(false)
      void queryClient.invalidateQueries({ queryKey: ['employees', 'attendance'] })
      navigate(`/employees/attendance?tab=day${date !== today ? `&date=${date}` : ''}`)
    },
    onError: (err) => {
      setConfirming(false)
      toast(err instanceof Error ? err.message : 'Could not save attendance', 'danger')
    },
  })

  const save = () => (unmarked > 0 ? setConfirming(true) : saveMutation.mutate())
  const saveDisabled = records.length === 0 || problems.length > 0 || managerOnly || (needsReason && !reason.trim())

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Couldn't load attendance" description="Something went wrong fetching the roster for this date." onRetry={() => void refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="Daily Attendance Entry"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Attendance', to: '/employees/attendance' }, { label: 'Entry' }]}
        actions={
          <Button onClick={save} loading={saveMutation.isPending} disabled={saveDisabled} title={records.length === 0 ? 'Nothing changed yet' : undefined}>
            Save{records.length > 0 && ` (${records.length})`}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Input
            label="Date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && e.target.value <= today && setParams({ date: e.target.value }, { replace: true })}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setMarks(markAllPresent(rows, marks))}>
          Mark All Present
        </Button>
        <span className="text-sm text-text-muted">{unmarked > 0 ? `${unmarked} not marked` : 'Everyone has a status'}</span>
      </div>

      {needsReason && (
        <Card className="mb-4 max-w-xl">
          <p className="mb-2 text-sm text-text">
            {formatDate(date)} is more than {data.editWindowDays} days back.{' '}
            {managerOnly ? 'Only the Factory Manager can change it.' : 'A reason is required; the change is audited.'}
          </p>
          {!managerOnly && <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />}
        </Card>
      )}

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <EntryRow key={r.employeeId} row={r} mark={marks[r.employeeId]} onChange={(m) => setMark(r.employeeId, m)} />
          ))}
        </ul>
      </Card>

      <LightConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
        title="Some employees aren't marked"
        confirmLabel="Save anyway"
        message={
          <>
            {unmarked} employee{unmarked === 1 ? ' is' : 's are'} not marked for {formatDate(date)}. They stay "Not marked" — not Absent. Save
            anyway?
          </>
        }
      />
    </div>
  )
}

function EntryRow({ row: r, mark, onChange }: { row: AttendanceDayRow; mark: EntryMark | undefined; onChange: (m: EntryMark | undefined) => void }) {
  const off = isNonWorking(r.dayType)
  const locked = !!r.lockedReason
  // a non-working day: only "Worked on holiday" (stored as Present / Half-day / Short leave + the flag)
  const options: AttendanceStatus[] = off ? (r.workAllowed ? ['Present', 'Half-day', 'Short leave'] : []) : WORKING
  const label = (o: AttendanceStatus) => (off && o === 'Present' ? 'Worked on holiday' : o)
  const problem = mark ? markProblem(mark) : null
  return (
    <li className={cn('flex flex-col gap-2 px-4 py-3', off && 'bg-surface-sunken/50')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-primary">{initials(r.name)}</span>
          <span>
            <span className="block text-sm font-medium text-text">{r.name}</span>
            <span className="id block text-xs text-text-muted">
              {r.employeeId} · {r.role}
            </span>
          </span>
          {r.dayLabel && <StatusBadge tone="neutral">{r.dayLabel}</StatusBadge>}
        </span>
        {locked ? (
          <span className="flex items-center gap-1.5 text-xs text-text-muted" title={r.lockedReason ?? undefined}>
            <Lock className="size-3.5" aria-hidden /> {r.status ?? 'Locked'} — {r.lockedReason}
          </span>
        ) : options.length === 0 ? (
          <span className="text-xs text-text-muted">{r.dayLabel ?? 'Non-working day'} — no work allowed</span>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${r.name} attendance`}>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className={cn(
                'rounded-full border border-dashed px-3 py-1.5 text-[13px] font-medium',
                !mark ? 'border-border-strong text-text' : 'border-transparent text-text-muted hover:bg-surface-hover',
              )}
              aria-pressed={!mark}
            >
              Not marked
            </button>
            {options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={mark?.status === o}
                onClick={() => onChange({ status: o, ...(o === 'Half-day' ? { half: mark?.half } : {}) })}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                  mark?.status === o ? optionClass[o] : 'text-text-muted hover:bg-surface-hover',
                )}
              >
                {label(o)}
              </button>
            ))}
          </div>
        )}
      </div>
      {!locked && mark?.status === 'Half-day' && (
        <div className="flex items-center gap-2 pl-11 text-sm">
          <span className="text-text-muted">Half worked:</span>
          {(['AM', 'PM'] as const).map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={mark.half === h}
              onClick={() => onChange({ ...mark, half: h })}
              className={cn('rounded-full px-3 py-1 text-xs font-medium', mark.half === h ? optionClass['Half-day'] : 'text-text-muted hover:bg-surface-hover')}
            >
              {h}
            </button>
          ))}
        </div>
      )}
      {!locked && mark?.status === 'Short leave' && (
        <div className="flex flex-wrap items-end gap-2 pl-11">
          <div className="w-32">
            <Input label="Time out" type="time" value={mark.shortOut ?? ''} onChange={(e) => onChange({ ...mark, shortOut: e.target.value })} />
          </div>
          <div className="w-32">
            <Input label="Time back" type="time" value={mark.shortBack ?? ''} onChange={(e) => onChange({ ...mark, shortBack: e.target.value })} />
          </div>
        </div>
      )}
      {problem && <p className="pl-11 text-xs text-danger-fg">{problem}</p>}
    </li>
  )
}
