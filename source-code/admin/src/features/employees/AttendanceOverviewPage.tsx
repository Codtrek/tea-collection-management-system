import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Download, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/data/StatCard'
import { ErrorState } from '@/components/data/ErrorState'
import * as employeesService from '@/services/employees'
import type { AttendanceStatus } from './types'
import { cn } from '@/lib/cn'

const PERIOD = 'July 2026'
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const dotClass: Record<AttendanceStatus, string> = {
  Present: 'bg-success-fg',
  Absent: 'bg-danger',
  Leave: 'bg-warning-fg',
  'Half-day': 'bg-brand',
}

export function AttendanceOverviewPage() {
  const navigate = useNavigate()
  const [picked, setPicked] = useState('')

  const {
    data: employees,
    isPending: employeesPending,
    isError: employeesError,
    refetch: refetchEmployees,
  } = useQuery({ queryKey: ['employees'], queryFn: employeesService.list })
  const {
    data: attendance,
    isPending: attendancePending,
    isError: attendanceError,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['employees', 'attendance', '2026-07'],
    queryFn: () => employeesService.listAttendance(undefined, '2026-07'),
  })

  if (employeesPending || attendancePending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (employeesError || attendanceError || !employees || !attendance) {
    return (
      <ErrorState
        title="Couldn't load attendance"
        description="Something went wrong fetching attendance records."
        onRetry={() => {
          void refetchEmployees()
          void refetchAttendance()
        }}
      />
    )
  }

  const activeEmployees = employees.filter((e) => e.status === 'Active')
  const dates = [...new Set(attendance.map((a) => a.date))].sort()
  const latestDate = dates[dates.length - 1]
  const selectedDate = picked || latestDate
  const selectedRecords = attendance.filter((a) => a.date === selectedDate)
  const present = selectedRecords.filter((a) => a.status === 'Present').length
  const absent = selectedRecords.filter((a) => a.status === 'Absent').length
  const onLeave = selectedRecords.filter((a) => a.status === 'Leave').length

  const statusByEmployeeAndDay = new Map<string, AttendanceStatus>()
  for (const a of attendance) {
    statusByEmployeeAndDay.set(`${a.employeeId}:${a.date.slice(-2)}`, a.status)
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Attendance' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Download className="size-4" /> Export</Button>
            <Button size="sm" onClick={() => navigate('/employees/attendance/entry')}>
              <CalendarCheck className="size-4" /> Mark Attendance
            </Button>
          </div>
        }
      />

      <div className="mb-4 w-48">
        <Input
          label="Date"
          type="date"
          value={selectedDate ?? ''}
          onChange={(e) => setPicked(e.target.value)}
          min="2026-07-01"
          max="2026-07-31"
        />
      </div>

      <div className="mb-6 grid gap-6 sm:grid-cols-3">
        <StatCard label={selectedDate ? `Present (${selectedDate})` : 'Present'} value={present} format={(v) => `${Math.round(v)}`} />
        <StatCard label={selectedDate ? `Absent (${selectedDate})` : 'Absent'} value={absent} format={(v) => `${Math.round(v)}`} tone="warning" />
        <StatCard label={selectedDate ? `On Leave (${selectedDate})` : 'On Leave'} value={onLeave} format={(v) => `${Math.round(v)}`} />
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text-heading">{PERIOD}</p>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {(['Present', 'Absent', 'Leave', 'Half-day'] as AttendanceStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={cn('size-2.5 rounded-full', dotClass[s])} /> {s}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-surface px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-text-muted">Employee</th>
                {DAYS.map((d) => (
                  <th key={d} className="px-1 py-2 text-center text-[11px] font-medium text-text-muted">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEmployees.map((e) => (
                <tr key={e.id} className="border-b border-[#eff2ed] last:border-0 hover:bg-surface-hover">
                  <td className="sticky left-0 bg-surface px-4 py-2 text-sm text-text">{e.name}</td>
                  {DAYS.map((d) => {
                    const dayKey = String(d).padStart(2, '0')
                    const s = statusByEmployeeAndDay.get(`${e.id}:${dayKey}`)
                    return (
                      <td key={d} className="px-1 py-2 text-center">
                        <span
                          className={cn('mx-auto block size-2.5 rounded-full', s ? dotClass[s] : 'bg-border')}
                          title={s ? `Day ${d}: ${s}` : `Day ${d}: not marked`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
