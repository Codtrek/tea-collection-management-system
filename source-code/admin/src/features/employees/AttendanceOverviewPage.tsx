import { useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarCheck, Download, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Tabs } from '@/components/ui/Tabs'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatCard } from '@/components/data/StatCard'
import { ErrorState } from '@/components/data/ErrorState'
import { EmptyState } from '@/components/data/EmptyState'
import { MonthPicker } from '@/components/patterns/MonthPicker'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import * as employeesService from '@/services/employees'
import { monthOptionsFor, periodOf } from '@/lib/month'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { AttendanceGrid } from './AttendanceGrid'
import { attendanceParams, CODE_CLASS, CODE_LABEL, readAttendanceFilters, type AttendanceFilters } from './attendance-view'
import type { AttendanceMonthRow } from './types'

/*
  EMP-05 Attendance (Attendance-Leave-Addendum Phase 1). Opens on the CURRENT month; the month,
  the tab (Month / Day), the date and the filters live in the URL. The grid and the totals come
  from the server (AttendanceService) with the holiday calendar's day types. A row opens the
  employee's Attendance & Leave tab.
*/
export function AttendanceOverviewPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canMark = can('attendance', 'edit')
  const today = factoryToday()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readAttendanceFilters(searchParams, today)
  const setFilters = (patch: Partial<AttendanceFilters>) =>
    setSearchParams(attendanceParams({ ...filters, ...patch }, today), { replace: true })

  const query = {
    month: filters.month,
    search: filters.search || undefined,
    role: filters.role || undefined,
    routeId: filters.route ? Number(filters.route) : undefined,
    unmarked: filters.unmarked,
  }
  const month = useQuery({
    queryKey: ['employees', 'attendance', 'month', query],
    queryFn: () => employeesService.getAttendanceMonth(query),
    placeholderData: keepPreviousData,
    enabled: filters.tab === 'month',
  })
  const day = useQuery({
    queryKey: ['employees', 'attendance', 'day', filters.date],
    queryFn: () => employeesService.getAttendanceDay(filters.date),
    enabled: filters.tab === 'day',
  })

  const openEmployee = (id: string) => navigate(`/employees/${id}?tab=attendance`)
  const exportCsv = () => {
    if (!month.data) return
    const cols = [
      { header: 'Employee ID', value: (r: AttendanceMonthRow) => r.employeeId },
      { header: 'Name', value: (r: AttendanceMonthRow) => r.name },
      { header: 'Role', value: (r: AttendanceMonthRow) => r.role },
      ...month.data.days.map((d, i) => ({ header: d.date, value: (r: AttendanceMonthRow) => r.cells[i]?.code ?? '' })),
      { header: 'Present', value: (r: AttendanceMonthRow) => r.totals.present },
      { header: 'Absent', value: (r: AttendanceMonthRow) => r.totals.absent },
      { header: 'Leave', value: (r: AttendanceMonthRow) => r.totals.leave },
      { header: 'Half-day', value: (r: AttendanceMonthRow) => r.totals.half },
      { header: 'Short leave', value: (r: AttendanceMonthRow) => r.totals.short },
      { header: 'Attendance %', value: (r: AttendanceMonthRow) => r.totals.pct ?? '' },
    ]
    downloadCsv(`attendance-${filters.month}.csv`, toCsv(cols, month.data.rows))
  }

  const entryDate = filters.tab === 'day' ? filters.date : today

  return (
    <div>
      <PageHeader
        title="Attendance"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Attendance' }]}
        actions={
          <div className="flex gap-2">
            {filters.tab === 'month' && (
              <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!month.data || month.data.rows.length === 0}>
                <Download className="size-4" /> Export
              </Button>
            )}
            {canMark && (
              <Button size="sm" onClick={() => navigate(`/employees/attendance/entry?date=${entryDate}`)}>
                <CalendarCheck className="size-4" /> Mark Attendance
              </Button>
            )}
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'month', label: 'Month' },
          { id: 'day', label: 'Day' },
        ]}
        active={filters.tab}
        onChange={(t) => setFilters({ tab: t as AttendanceFilters['tab'] })}
        className="mb-4"
      />

      {filters.tab === 'month' ? (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <MonthPicker
              month={filters.month}
              options={monthOptionsFor(today.slice(0, 7), [])}
              onChange={(m) => setFilters({ month: m })}
              ariaLabel="Attendance month"
            />
            <div className="w-64">
              <Input aria-label="Search employees" placeholder="Search name or EMP- ID…" value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} />
            </div>
            <div className="w-44">
              <Select
                aria-label="Role"
                placeholder="All roles"
                value={filters.role}
                onChange={(e) => setFilters({ role: e.target.value })}
                options={(month.data?.roles ?? []).map((r) => ({ value: r, label: r }))}
              />
            </div>
            <div className="w-40">
              <Select
                aria-label="Route (agents)"
                placeholder="All routes"
                value={filters.route}
                onChange={(e) => setFilters({ route: e.target.value })}
                options={(month.data?.routes ?? []).map((r) => ({ value: String(r.id), label: r.name }))}
              />
            </div>
            <Checkbox label="Has unmarked days" checked={filters.unmarked} onChange={(e) => setFilters({ unmarked: e.target.checked })} />
            {month.isFetching && <Loader2 className="size-4 animate-spin text-text-muted" aria-label="Updating" />}
          </div>

          {month.isPending ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
            </div>
          ) : month.isError ? (
            <ErrorState title="Couldn't load attendance" description="Something went wrong fetching the month." onRetry={() => void month.refetch()} />
          ) : (
            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-text-heading">{periodOf(filters.month)}</p>
                <p className="text-xs text-text-muted">{month.data.rows.length} employees</p>
              </div>
              {month.data.rows.length === 0 ? (
                <EmptyState title="No employees match" description="Change the filters to see more." />
              ) : (
                <AttendanceGrid data={month.data} onRowClick={(r) => openEmployee(r.employeeId)} />
              )}
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 w-48">
            <Input label="Date" type="date" value={filters.date} max={today} onChange={(e) => e.target.value && setFilters({ date: e.target.value })} />
          </div>
          {day.isPending ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
            </div>
          ) : day.isError ? (
            <ErrorState title="Couldn't load attendance" description="Something went wrong fetching the day." onRetry={() => void day.refetch()} />
          ) : (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Present" value={day.data.summary.present} format={(v) => `${Math.round(v)}`} />
                <StatCard label="Absent" value={day.data.summary.absent} format={(v) => `${Math.round(v)}`} tone="warning" />
                <StatCard label="On leave" value={day.data.summary.onLeave} format={(v) => `${Math.round(v)}`} />
                <StatCard label="Not marked" value={day.data.summary.notMarked} format={(v) => `${Math.round(v)}`} tone={day.data.summary.notMarked > 0 ? 'warning' : 'default'} />
              </div>
              <Card className="p-0">
                <div className="border-b border-border px-4 py-3 text-sm font-semibold text-text-heading">{formatDate(filters.date)}</div>
                <ul className="divide-y divide-border">
                  {day.data.rows.map((r) => (
                    <li key={r.employeeId}>
                      <button
                        type="button"
                        onClick={() => openEmployee(r.employeeId)}
                        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-hover"
                      >
                        <span>
                          <span className="block text-sm font-medium text-text">{r.name}</span>
                          <span className="block text-xs text-text-muted">
                            {r.employeeId} · {r.role}
                            {r.routes.length > 0 && ` · ${r.routes.map((x) => x.name).join(', ')}`}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          {r.dayLabel && <StatusBadge tone="neutral">{r.dayLabel}</StatusBadge>}
                          {r.code ? (
                            <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', CODE_CLASS[r.code])}>
                              {CODE_LABEL[r.code]}
                              {r.half && ` (${r.half})`}
                              {r.shortOut && r.shortBack && ` ${r.shortOut}–${r.shortBack}`}
                            </span>
                          ) : (
                            <span className="rounded-full border border-dashed border-border-strong px-2.5 py-1">Not marked</span>
                          )}
                          {r.markedBy && (
                            <span>
                              by {r.markedBy}
                              {r.markedAt && `, ${formatDateTime(r.markedAt)}`}
                              {r.source && r.source !== 'portal' && ` (${r.source})`}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
