import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/data/StatCard'
import { AreaChartCard, BarChartCard } from '@/components/charts/ChartCard'
import { useAuth } from '@/context/AuthContext'
import { EMPLOYEES } from './data'

const ATTENDANCE_TREND = [
  { m: 'Feb', rate: 92 },
  { m: 'Mar', rate: 94 },
  { m: 'Apr', rate: 91 },
  { m: 'May', rate: 95 },
  { m: 'Jun', rate: 96 },
  { m: 'Jul', rate: 96 },
]
const TASK_COMPLETION = [
  { w: 'W1', done: 88 },
  { w: 'W2', done: 92 },
  { w: 'W3', done: 85 },
  { w: 'W4', done: 94 },
]

export function PerformancePage() {
  const { level } = useAuth()
  const [empId, setEmpId] = useState(EMPLOYEES[0].id)
  const emp = EMPLOYEES.find((e) => e.id === empId) ?? EMPLOYEES[0]
  // Officer sees limited/no comparative data (§4 read/oversight split).
  const showComparison = level('performance') !== 'view'

  return (
    <div>
      <PageHeader
        title="Performance"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Performance' }]}
        actions={
          <div className="w-56">
            <Select value={empId} onChange={(e) => setEmpId(e.target.value)} options={EMPLOYEES.map((e) => ({ value: e.id, label: e.name }))} />
          </div>
        }
      />

      <div className="mb-6 grid gap-6 sm:grid-cols-3">
        <StatCard label="Attendance Rate" value={96} format={(v) => `${Math.round(v)}%`} deltaPercent={showComparison ? 5.5 : undefined} note={showComparison ? 'above team avg (91%)' : undefined} />
        <StatCard label="Task Completion" value={90} format={(v) => `${Math.round(v)}%`} />
        <StatCard label="Punctuality" value={98} format={(v) => `${Math.round(v)}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AreaChartCard title={`Attendance Rate Trend — ${emp.name}`} data={ATTENDANCE_TREND} xKey="m" yKey="rate" valueFmt={(v) => `${v}%`} />
        <BarChartCard title="Task / Collection Completion (%)" data={TASK_COMPLETION} xKey="w" yKey="done" valueFmt={(v) => `${v}%`} />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <p className="text-sm text-text-muted">
          {showComparison
            ? `${emp.name}'s attendance rate of 96% is above the team average (91%).`
            : 'Comparative team data is available to Administrators and Managers.'}
        </p>
      </Card>
    </div>
  )
}
