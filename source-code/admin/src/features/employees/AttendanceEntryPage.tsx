import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as employeesService from '@/services/employees'
import type { AttendanceStatus } from './types'
import { initials } from '@/lib/format'
import { cn } from '@/lib/cn'

const OPTIONS: AttendanceStatus[] = ['Present', 'Absent', 'Leave', 'Half-day']

const optionClass: Record<AttendanceStatus, string> = {
  Present: 'bg-success-bg text-success-fg',
  Absent: 'bg-danger-bg text-danger-fg',
  Leave: 'bg-warning-bg text-warning-fg',
  'Half-day': 'bg-brand-soft text-primary',
}

export function AttendanceEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [date, setDate] = useState('2026-07-17')
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({})

  const { data: employees, isPending, isError, refetch } = useQuery({ queryKey: ['employees'], queryFn: employeesService.list })
  const activeEmployees = (employees ?? []).filter((e) => e.status === 'Active')

  const markAll = (s: AttendanceStatus) => setMarks(Object.fromEntries(activeEmployees.map((e) => [e.id, s])))

  const markMutation = useMutation({
    mutationFn: () =>
      employeesService.markAttendance({
        date,
        records: activeEmployees.map((e) => ({ employeeId: e.id, status: marks[e.id] ?? 'Present' })),
      }),
    onSuccess: () => {
      toast(`Attendance saved for ${date}`)
      void queryClient.invalidateQueries({ queryKey: ['employees', 'attendance'] })
      navigate('/employees/attendance')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not save attendance', 'danger'),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Couldn't load employees" description="Something went wrong fetching the employee roster." onRetry={() => void refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="Daily Attendance Entry"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Attendance', to: '/employees/attendance' }, { label: 'Entry' }]}
        actions={<Button onClick={() => markMutation.mutate()} loading={markMutation.isPending}>Save</Button>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button variant="secondary" size="sm" onClick={() => markAll('Present')}>Mark All Present</Button>
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {activeEmployees.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-primary">
                  {initials(e.name)}
                </span>
                <span>
                  <span className="block text-sm font-medium text-text">{e.name}</span>
                  <span className="id block text-xs text-text-muted">{e.id}</span>
                </span>
              </span>
              <div className="flex gap-1.5">
                {OPTIONS.map((o) => {
                  const active = (marks[e.id] ?? 'Present') === o
                  return (
                    <button
                      key={o}
                      onClick={() => setMarks((m) => ({ ...m, [e.id]: o }))}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                        active ? optionClass[o] : 'text-text-muted hover:bg-surface-hover',
                      )}
                    >
                      {o}
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
