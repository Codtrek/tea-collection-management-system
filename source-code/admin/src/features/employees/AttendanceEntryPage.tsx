import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { EMPLOYEES } from './data'
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
  const [date, setDate] = useState('2026-07-17')
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(EMPLOYEES.map((e) => [e.id, 'Present' as AttendanceStatus])),
  )

  const markAll = (s: AttendanceStatus) => setMarks(Object.fromEntries(EMPLOYEES.map((e) => [e.id, s])))

  const save = () => {
    toast(`Attendance saved for ${date}`)
    navigate('/employees/attendance')
  }

  return (
    <div>
      <PageHeader
        title="Daily Attendance Entry"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Attendance', to: '/employees/attendance' }, { label: 'Entry' }]}
        actions={<Button onClick={save}>Save</Button>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button variant="secondary" size="sm" onClick={() => markAll('Present')}>Mark All Present</Button>
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {EMPLOYEES.map((e) => (
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
                  const active = marks[e.id] === o
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
