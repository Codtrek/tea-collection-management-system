import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { BookOpen, Clock, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ErrorState } from '@/components/data/ErrorState'
import { EmptyState } from '@/components/data/EmptyState'
import { MonthPicker } from '@/components/patterns/MonthPicker'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import * as performanceService from '@/services/performance'
import { monthOptionsFor } from '@/lib/month'
import { cn } from '@/lib/cn'
import { MEASURE_DEFINITIONS } from './measure-definitions'
import { MeasureCell } from './MeasureCell'
import { MeasureInfo } from './MeasureInfo'
import { performanceParams, readPerformanceParams, sortValue, type PerformanceParams } from './performance-view'
import type { MeasureKey, PersonMeasures, TeamPerformance } from './types'

/*
  Performance — the team overview (Performance-Addendum §2). Collection agents by default, one
  column per measure, every percentage with its counts, marked only against the person's own
  previous 3 months; other staff get attendance only, compared within their role. No ranks, no
  badges, no overall score. Every figure comes from PerformanceService (real records).
  The tab, month and span live in the URL.
*/
export function PerformancePage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const allowed = can('performance', 'view')
  const today = factoryToday()
  const [searchParams, setSearchParams] = useSearchParams()
  const p = readPerformanceParams(searchParams, today)
  const set = (patch: Partial<PerformanceParams>) => setSearchParams(performanceParams({ ...p, ...patch }, today), { replace: true })

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['performance', 'team', p],
    queryFn: () => performanceService.getTeam({ month: p.month, span: p.span, group: p.tab }),
    placeholderData: keepPreviousData,
    enabled: allowed,
  })

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Performance" breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Performance' }]} />
        <EmptyState title="Not available for your role" description="Performance is for the Factory Manager and the Administrator." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Performance"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Performance' }]}
        actions={
          <Link to="/employees/performance/how" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <BookOpen className="size-4" aria-hidden /> How performance is measured
          </Link>
        }
      />
      <p className="-mt-2 mb-4 text-sm text-text-muted">Use these figures to start a conversation, not to make decisions on their own.</p>

      <Tabs
        tabs={[
          { id: 'agents', label: 'Collection agents' },
          { id: 'staff', label: 'Other staff' },
        ]}
        active={p.tab}
        onChange={(t) => set({ tab: t as PerformanceParams['tab'] })}
        className="mb-4"
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <MonthPicker month={p.month} options={monthOptionsFor(today.slice(0, 7), [])} onChange={(month) => set({ month })} ariaLabel="Performance month" />
        <div className="flex gap-1" role="radiogroup" aria-label="Period">
          {([1, 3] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={p.span === s}
              onClick={() => set({ span: s })}
              className={cn('rounded-full px-3 py-1.5 text-sm font-medium', p.span === s ? 'bg-brand-soft text-primary' : 'text-text-muted hover:bg-surface-hover')}
            >
              {s === 1 ? 'This month' : 'Last 3 months'}
            </button>
          ))}
        </div>
        {data && <span className="pb-1.5 text-sm text-text-muted">{data.period.label}</span>}
        {isFetching && <Loader2 className="mb-2 size-4 animate-spin text-text-muted" aria-label="Updating" />}
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
        </div>
      ) : isError ? (
        <ErrorState title="Couldn't load performance" description="Something went wrong fetching the figures." onRetry={() => void refetch()} />
      ) : p.tab === 'agents' ? (
        <AgentsView data={data} onOpen={(r) => navigate(`/employees/${r.employeeId}?tab=performance`)} />
      ) : (
        <StaffView data={data} onOpen={(r) => navigate(`/employees/${r.employeeId}?tab=performance`)} />
      )}
    </div>
  )
}

function measureColumns(data: TeamPerformance, group: string): Column<PersonMeasures>[] {
  const avg = data.averages[group] ?? {}
  return data.measures.map((k: MeasureKey) => ({
    key: k,
    header: MEASURE_DEFINITIONS[k].label,
    minWidth: 150,
    sortable: true,
    sortValue: (r) => sortValue(r.measures[k]),
    headerExtra: (
      <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <MeasureInfo measure={k} tolerancePct={data.tolerancePct} />
        {k === 'coverHelp' || k === 'leave' ? 'Information only' : `Avg ${avgText(k, avg[k])}`}
      </span>
    ),
    render: (r) => <MeasureCell measure={r.measures[k]} />,
  }))
}

function avgText(k: MeasureKey, v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (k === 'absences') return `${v} day(s)`
  if (k === 'kg') return `${v}% of route avg`
  return `${v}%`
}

const nameColumn = (label: string): Column<PersonMeasures> => ({
  key: 'name',
  header: label,
  minWidth: 180,
  sortable: true,
  sortValue: (r) => r.name,
  render: (r) => (
    <span>
      <span className="block font-medium text-text">{r.name}</span>
      <span className="id block text-xs text-text-muted">{r.employeeId}</span>
    </span>
  ),
})

const notesColumn: Column<PersonMeasures> = {
  key: 'notes',
  header: 'Notes (facts)',
  minWidth: 240,
  render: (r) =>
    r.notes.length === 0 ? (
      <span className="text-xs text-text-muted">—</span>
    ) : (
      <ul className="flex flex-col gap-1 text-xs text-text">
        {r.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    ),
}

function AgentsView({ data, onOpen }: { data: TeamPerformance; onOpen: (r: PersonMeasures) => void }) {
  return (
    <>
      <Card className="p-0">
        <DataTable
          columns={[nameColumn('Agent'), ...measureColumns(data, 'Collection agents'), notesColumn]}
          rows={data.rows}
          rowKey={(r) => r.employeeId}
          onRowClick={onOpen}
          stickyFirstColumn
          valign="top"
          defaultSort={{ key: 'name', direction: 'asc' }}
          emptyState={<EmptyState title="No collection agents" description="Agents appear here once they're linked to an employee record." />}
        />
      </Card>
      {data.comingSoon.length > 0 && (
        <Card className="mt-4">
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
    </>
  )
}

/** Other staff: attendance only, one table per role so comparisons stay within the role. */
function StaffView({ data, onOpen }: { data: TeamPerformance; onOpen: (r: PersonMeasures) => void }) {
  const roles = [...new Set(data.rows.map((r) => r.role))].sort()
  if (roles.length === 0) return <EmptyState title="No other staff" description="Nobody else is on the roster." />
  return (
    <div className="flex flex-col gap-4">
      {roles.map((role) => (
        <Card key={role} className="p-0">
          <p className="border-b border-border px-4 py-3 text-sm font-semibold text-text-heading">{role}</p>
          <DataTable
            columns={[nameColumn('Employee'), ...measureColumns(data, role), notesColumn]}
            rows={data.rows.filter((r) => r.role === role)}
            rowKey={(r) => r.employeeId}
            onRowClick={onOpen}
            valign="top"
            defaultSort={{ key: 'name', direction: 'asc' }}
          />
        </Card>
      ))}
    </div>
  )
}
