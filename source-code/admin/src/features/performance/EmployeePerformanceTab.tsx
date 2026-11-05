import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { Sparkline } from '@/components/charts/Sparkline'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as performanceService from '@/services/performance'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { MEASURE_DEFINITIONS } from './measure-definitions'
import { MeasureCell } from './MeasureCell'
import { MeasureInfo } from './MeasureInfo'
import { cellText } from './performance-view'
import type { EmployeePerformance, MeasureKey } from './types'

/*
  The employee's Performance tab (Performance-Addendum §5): the same measures as the team table,
  month by month for the last 6 complete months — a small trend line plus each month's figure
  with its counts — a drill-down to the records behind each one, and the Manager's private,
  dated notes (audited). Every figure is PerformanceService's.
*/
export function EmployeePerformanceTab({ employeeId }: { employeeId: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['performance', 'employee', employeeId],
    queryFn: () => performanceService.getEmployee(employeeId),
  })
  const [picked, setPicked] = useState<string | null>(null)

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) return <ErrorState title="Couldn't load performance" description="Something went wrong." onRetry={() => void refetch()} />

  const month = picked ?? data.months.at(-1)!.month
  const current = data.months.find((m) => m.month === month) ?? data.months.at(-1)!

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        Use these figures to start a conversation, not to make decisions on their own.{' '}
        <Link to="/employees/performance/how" className="text-primary hover:underline">
          How performance is measured
        </Link>
      </p>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Month">
        {data.months.map((m) => (
          <button
            key={m.month}
            type="button"
            role="radio"
            aria-checked={m.month === month}
            onClick={() => setPicked(m.month)}
            className={cn('rounded-full px-3 py-1.5 text-sm font-medium', m.month === month ? 'bg-brand-soft text-primary' : 'text-text-muted hover:bg-surface-hover')}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.measures.map((k) => (
          <MeasureCard key={`${k}-${month}`} data={data} measure={k} month={month} current={current.measures[k]} />
        ))}
      </div>

      {data.comingSoon.length > 0 && (
        <Card>
          <CardTitle className="mb-2">Coming soon</CardTitle>
          <ul className="flex flex-col gap-1.5 text-sm">
            {data.comingSoon.map((c) => (
              <li key={c.key} className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                <span>
                  <span className="font-medium text-text">{c.label}</span> <span className="text-text-muted">— {c.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Notes data={data} />
    </div>
  )
}

function MeasureCard({
  data,
  measure,
  month,
  current,
}: {
  data: EmployeePerformance
  measure: MeasureKey
  month: string
  current: EmployeePerformance['months'][number]['measures'][MeasureKey]
}) {
  const [open, setOpen] = useState(false)
  // only months with a real figure (kg: the total) — "Not enough data" and "no requests" aren't points
  const points = data.months
    .map((m) => m.measures[measure])
    .filter((m) => m && (m.key === 'kg' || m.status !== 'not_enough') && m.value !== null)
    .map((m) => ({ value: m!.value! }))
  const drill = useQuery({
    queryKey: ['performance', 'drill', data.employeeId, measure, month],
    queryFn: () => performanceService.getDrill(data.employeeId, measure, month),
    enabled: open,
  })
  return (
    <Card>
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-text-heading">
          {MEASURE_DEFINITIONS[measure].label}
          <MeasureInfo measure={measure} tolerancePct={data.tolerancePct} />
        </span>
        <Sparkline data={points} />
      </div>
      <MeasureCell measure={current} />
      <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
        {data.months.map((m) => (
          <li key={m.month} className={cn(m.month === month && 'font-medium text-text')}>
            {m.label.slice(0, 3)}: {cellText(m.measures[measure]).main.replace('Not enough data', 'n/a')}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline" aria-expanded={open}>
        {open ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />} Details for {data.months.find((m) => m.month === month)?.label}
      </button>
      {open && (
        <div className="mt-2 border-t border-border pt-2">
          {drill.isPending ? (
            <Loader2 className="size-4 animate-spin text-text-muted" aria-label="Loading" />
          ) : drill.isError ? (
            <p className="text-sm text-danger-fg">{drill.error instanceof Error ? drill.error.message : 'Couldn’t load the details.'}</p>
          ) : drill.data.rows.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing to list for this month.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto text-sm">
              {drill.data.rows.map((r, i) => (
                <li key={`${r.date}-${i}`}>
                  <span className="tabular text-text-muted">{formatDate(r.date)}</span> · <span className="text-text">{r.title}</span>
                  {r.tag && (
                    <StatusBadge tone="neutral" className="ml-1.5">
                      {r.tag}
                    </StatusBadge>
                  )}
                  {r.detail && <span className="block text-xs text-text-muted">{r.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

/** Dated notes from conversations — private to Manager and Administrator, audited. */
function Notes({ data }: { data: EmployeePerformance }) {
  const { can } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const add = useMutation({
    mutationFn: () => performanceService.addNote(data.employeeId, text.trim()),
    onSuccess: () => {
      toast('Note saved')
      setText('')
      void queryClient.invalidateQueries({ queryKey: ['performance', 'employee', data.employeeId] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not save the note', 'danger'),
  })
  return (
    <Card>
      <CardTitle className="mb-1">Notes from conversations</CardTitle>
      <p className="mb-3 text-xs text-text-muted">Private to the Manager and the Administrator. Every note is dated and audited.</p>
      {can('performance', 'edit') && (
        <div className="mb-4 flex flex-col gap-2">
          <label htmlFor="perf-note" className="sr-only">
            New note
          </label>
          <textarea
            id="perf-note"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What was discussed, what was agreed …"
            className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          <Button size="sm" className="self-start" onClick={() => add.mutate()} loading={add.isPending} disabled={!text.trim()}>
            Add note
          </Button>
        </div>
      )}
      {data.notes.length === 0 ? (
        <p className="text-sm text-text-muted">No notes yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.notes.map((n) => (
            <li key={n.id} className="border-l-2 border-border pl-3">
              <p className="whitespace-pre-wrap text-sm text-text">{n.note}</p>
              <p className="text-xs text-text-muted">
                {n.author}, {formatDateTime(n.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
