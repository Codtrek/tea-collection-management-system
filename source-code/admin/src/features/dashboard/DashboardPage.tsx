import { Link } from 'react-router-dom'
import {
  Leaf,
  Wallet,
  Sprout,
  Banknote,
  Users,
  Plus,
  CheckCheck,
  FileBarChart,
  UserPlus,
} from 'lucide-react'
import { StatCard } from '@/components/data/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { NotificationCard } from '@/components/layout/NotificationCard'
import { useAuth } from '@/context/AuthContext'
import { NOTIFICATIONS } from '@/data/notifications'
import { formatCurrency, formatNumber, formatWeight } from '@/lib/format'

const COLLECTION_TREND = [
  { m: 'Mon', kg: 39800 },
  { m: 'Tue', kg: 42100 },
  { m: 'Wed', kg: 41050 },
  { m: 'Thu', kg: 45780 },
  { m: 'Fri', kg: 43900 },
]
const BY_ESTATE = [
  { estate: 'Green Valley', kg: 42000 },
  { estate: 'Hill Crest', kg: 31500 },
  { estate: 'Maple Ridge', kg: 28900 },
  { estate: 'Sunfield', kg: 21000 },
  { estate: 'Rosewood', kg: 18600 },
]
const GRADE_SPLIT = [
  { name: 'Super', value: 58, color: GRADE_SUPER },
  { name: 'Normal', value: 42, color: GRADE_NORMAL },
]

const PENDING_TASKS = [
  { label: 'Approve advance — S. Fernando (Rs. 15,000)', to: '/employees/advances', tone: 'warning' as const, badge: 'Pending' },
  { label: 'Process July payroll — 31 employees', to: '/employees/payroll', tone: 'warning' as const, badge: 'Due' },
  { label: 'Review weight mismatch — GV-2026-0714', to: '/collections', tone: 'danger' as const, badge: 'Flagged' },
]

const ACTIVITY = [
  { who: 'A. Bandara', what: 'processed payroll for June — Rs. 3.2M across 31 employees', when: '2h ago' },
  { who: 'S. Fernando', what: 'issued advance Rs. 50,000 to Green Valley Estate', when: '4h ago' },
  { who: 'System', what: 'confirmed collection GV-2026-0712 with photo evidence', when: '6h ago' },
]

export function DashboardPage() {
  const { user, can } = useAuth()
  const firstName = user?.name.split(' ').slice(-1)[0] ?? 'there'

  return (
    <div className="animate-fade-up flex flex-col gap-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] bg-gradient-to-br from-[#0f3d24] via-[#1b8b4e] to-[#53cf81] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-white/80">Here's your factory performance today · 17/07/2026</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('collection', 'edit') && (
            <QuickAction to="/collections" icon={<Plus className="size-4" />}>New Collection</QuickAction>
          )}
          {can('employees', 'edit') && (
            <QuickAction to="/employees/new" icon={<UserPlus className="size-4" />}>New Employee</QuickAction>
          )}
          {can('advances', 'approve') && (
            <QuickAction to="/employees/advances" icon={<CheckCheck className="size-4" />}>Approve Advances</QuickAction>
          )}
          <QuickAction to="/reports/collection" icon={<FileBarChart className="size-4" />}>Generate Report</QuickAction>
        </div>
      </div>

      {/* Tier 1 */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Today's Tea Collection" value={45780} format={formatWeight} icon={<Leaf className="size-4" strokeWidth={1.5} />} deltaPercent={4.3} note="vs yesterday" />
        <StatCard label="Pending Estate Payments" value={1245600} format={formatCurrency} icon={<Wallet className="size-4" strokeWidth={1.5} />} note="12 pending" />
        <StatCard label="Expiring Fertilizer Stock" value={3} format={(v) => `${Math.round(v)} batches`} icon={<Sprout className="size-4" strokeWidth={1.5} />} note="within 7 days" tone="warning" />
      </div>

      {/* Tier 2 */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Today's Revenue" value={342900} format={formatCurrency} icon={<Banknote className="size-4" strokeWidth={1.5} />} deltaPercent={6.2} note="Monthly Rs. 8.41M" />
        <StatCard label="Monthly Expenses" value={3210500} format={formatCurrency} icon={<Wallet className="size-4" strokeWidth={1.5} />} deltaPercent={-2.1} note="Net profit Rs. 5.2M" />
        <StatCard label="Employees Present" value={27} format={(v) => `${Math.round(v)} / 31`} icon={<Users className="size-4" strokeWidth={1.5} />} note="today" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AreaChartCard title="Collection Trend (kg)" data={COLLECTION_TREND} xKey="m" yKey="kg" valueFmt={formatWeight} />
        <DonutChartCard title="Tea Collection by Grade (%)" data={GRADE_SPLIT} valueFmt={(v) => `${v}%`} />
        <BarChartCard title="Top Estates by Volume (kg)" data={BY_ESTATE} xKey="estate" yKey="kg" valueFmt={formatWeight} />
      </div>

      {/* Route/agent panel */}
      <Card>
        <CardHeader>
          <CardTitle>Route &amp; Agent Overview</CardTitle>
          <StatusBadge tone="approved">5 routes active</StatusBadge>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {['Route 1', 'Route 2', 'Route 3', 'Route 4', 'Route 5'].map((r, i) => (
            <div key={r} className="rounded-[var(--radius-md)] border border-border p-3">
              <p className="text-sm font-medium text-text">{r}</p>
              <p className="tabular mt-1 text-xs text-text-muted">{formatNumber(4 + i)} agents · {formatWeight(8000 + i * 900)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-text-muted">Static route + agent-proximity view — not live GPS (matches project scope).</p>
      </Card>

      {/* Tier 3 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <ul className="flex flex-col gap-3">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                <span className="text-text">
                  <span className="font-medium">{a.who}</span> {a.what}
                  <span className="mt-0.5 block text-xs text-text-muted">{a.when}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pending Tasks</CardTitle></CardHeader>
          <ul className="flex flex-col gap-2">
            {PENDING_TASKS.map((t, i) => (
              <li key={i}>
                <Link to={t.to} className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border p-3 hover:bg-surface-hover">
                  <span className="text-sm text-text">{t.label}</span>
                  <StatusBadge tone={t.tone}>{t.badge}</StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <CardTitle>Notifications</CardTitle>
            <Link to="/notifications" className="text-[13px] font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {NOTIFICATIONS.slice(0, 4).map((n) => (
              <NotificationCard key={n.id} n={n} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function QuickAction({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-white/15 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/25"
    >
      {icon}
      {children}
    </Link>
  )
}
