import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/data/ErrorState'
import { MonthPicker } from '@/components/patterns/MonthPicker'
import { factoryToday } from '@/features/dispatch/status'
import * as employeesService from '@/services/employees'
import { monthOptionsFor } from '@/lib/month'
import { AttendanceGrid } from './AttendanceGrid'

/*
  EMP-03's "Attendance & Leave" tab (Attendance-Leave-Addendum): this employee's month grid with
  the holiday calendar's day types and the month's totals. Leave balances and history join it in
  Phase 3.
*/
export function EmployeeAttendanceTab({ employeeId }: { employeeId: string }) {
  const today = factoryToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['employees', 'attendance', 'month', { month, employeeId }],
    queryFn: () => employeesService.getAttendanceMonth({ month, employeeId }),
    placeholderData: keepPreviousData,
  })
  const t = data?.rows[0]?.totals

  return (
    <div className="flex flex-col gap-4">
      <MonthPicker month={month} options={monthOptionsFor(today.slice(0, 7), [])} onChange={setMonth} ariaLabel="Attendance month" />
      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
        </div>
      ) : isError ? (
        <ErrorState title="Couldn't load attendance" description="Something went wrong." onRetry={() => void refetch()} />
      ) : (
        <>
          {t && (
            <dl className="tabular grid grid-cols-3 gap-3 sm:grid-cols-6">
              {(
                [
                  ['Present', t.present],
                  ['Absent', t.absent],
                  ['Leave', t.leave],
                  ['Half-day', t.half],
                  ['Short leaves', t.short],
                  ['Attendance', t.pct === null ? '—' : `${t.pct}%`],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-[var(--radius-md)] bg-surface p-3 shadow-[var(--shadow-1)]">
                  <dt className="text-xs text-text-muted">{k}</dt>
                  <dd className="text-lg font-semibold text-text-heading">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <Card className="p-0">
            <AttendanceGrid data={data} single />
          </Card>
          <p className="text-xs text-text-muted">Leave balances and leave history are added with leave management.</p>
        </>
      )}
    </div>
  )
}
