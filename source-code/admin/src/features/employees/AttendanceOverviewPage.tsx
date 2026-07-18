import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/data/StatCard'
import { EMPLOYEES } from './data'
import type { AttendanceStatus } from './types'
import { cn } from '@/lib/cn'

const DAYS = Array.from({ length: 20 }, (_, i) => i + 1)

// Deterministic pseudo-status so the grid is stable across renders.
const statusFor = (empIdx: number, day: number): AttendanceStatus => {
  const seed = (empIdx * 7 + day * 13) % 20
  if (seed === 0) return 'Absent'
  if (seed === 1) return 'Leave'
  if (seed === 2) return 'Half-day'
  return 'Present'
}

const dotClass: Record<AttendanceStatus, string> = {
  Present: 'bg-success-fg',
  Absent: 'bg-danger',
  Leave: 'bg-warning-fg',
  'Half-day': 'bg-brand',
}

export function AttendanceOverviewPage() {
  const navigate = useNavigate()
  const present = EMPLOYEES.filter((e) => e.status === 'Active').length - 2

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

      <div className="mb-6 grid gap-6 sm:grid-cols-3">
        <StatCard label="Present Today" value={present} format={(v) => `${Math.round(v)}`} />
        <StatCard label="Absent Today" value={2} format={(v) => `${Math.round(v)}`} tone="warning" />
        <StatCard label="On Leave" value={1} format={(v) => `${Math.round(v)}`} />
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text-heading">July 2026</p>
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
              {EMPLOYEES.map((e, ei) => (
                <tr key={e.id} className="border-b border-[#eff2ed] last:border-0 hover:bg-surface-hover">
                  <td className="sticky left-0 bg-surface px-4 py-2 text-sm text-text">{e.name}</td>
                  {DAYS.map((d) => {
                    const s = statusFor(ei, d)
                    return (
                      <td key={d} className="px-1 py-2 text-center">
                        <span className={cn('mx-auto block size-2.5 rounded-full', dotClass[s])} title={`Day ${d}: ${s}`} />
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
