import { ArrowRight, Building2, ClipboardCheck, Sprout, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAdminStore } from '../data/AdminStore'
import {
  daysAgo,
  formatNumber,
  selectFactoriesByDistrict,
  selectMonthlyRegistrations,
  selectPlatformStats,
  selectUsersByRole,
} from '../data/selectors'
import { StatCard } from '../components/StatCard'
import { LinkButton } from '../components/LinkButton'

export default function DashboardPage() {
  const { factories, requests } = useAdminStore()
  const stats = selectPlatformStats(factories, requests)
  const byRole = selectUsersByRole(factories)
  const monthly = selectMonthlyRegistrations(factories)
  const byDistrict = selectFactoriesByDistrict(factories)
  const pending = requests.filter((r) => r.status === 'pending').slice(0, 5)

  const roleMax = Math.max(...byRole.map((r) => r.count), 1)
  const monthMax = Math.max(...monthly.map((m) => m.count), 1)
  const districtMax = Math.max(...byDistrict.map((d) => d.count), 1)

  return (
    <>
      <PageHeader title="Platform overview" description="Everything happening across Harboost factories." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registered factories"
          value={stats.registeredFactories}
          hint={`${stats.activeFactories} active · ${stats.suspendedFactories} suspended`}
          icon={Building2}
          to="/factories"
        />
        <StatCard
          label="Pending requests"
          value={stats.pendingRequests}
          hint={stats.pendingRequests ? 'Waiting for your review' : 'All caught up'}
          icon={ClipboardCheck}
          to="/requests"
          highlight={stats.pendingRequests > 0}
        />
        <StatCard
          label="Total users"
          value={formatNumber(stats.totalUsers)}
          hint="All roles, all factories"
          icon={Users}
        />
        <StatCard
          label="Estates onboarded"
          value={formatNumber(stats.estates)}
          hint={`${stats.routes} collection routes`}
          icon={Sprout}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle className="text-base">Users by role</CardTitle>
              <p className="text-[13px] text-text-muted">Accounts across every registered factory</p>
            </div>
          </CardHeader>
          <ul className="space-y-3">
            {byRole.map((r) => (
              <li key={r.role} className="grid grid-cols-[9.5rem_1fr_3.5rem] items-center gap-3 text-sm">
                <span className="truncate text-text-muted">{r.label}</span>
                <div className="h-2 rounded-full bg-border" title={`${r.label}: ${formatNumber(r.count)}`}>
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.max((r.count / roleMax) * 100, r.count ? 2 : 0)}%` }}
                  />
                </div>
                <span className="tabular text-right font-medium text-text">{formatNumber(r.count)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="text-base">New factories</CardTitle>
              <p className="text-[13px] text-text-muted">Registrations per month, last 6 months</p>
            </div>
          </CardHeader>
          <div className="flex h-44 items-end gap-3 border-b border-border pb-px">
            {monthly.map((m) => (
              <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="tabular text-xs font-medium text-text">{m.count || ''}</span>
                <div
                  className="w-full max-w-10 rounded-t bg-primary transition-opacity hover:opacity-80"
                  style={{ height: `${(m.count / monthMax) * 85}%` }}
                  title={`${m.label}: ${m.count} ${m.count === 1 ? 'factory' : 'factories'}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3">
            {monthly.map((m) => (
              <span key={m.key} className="flex-1 text-center text-xs text-text-muted">
                {m.label}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle className="text-base">Awaiting review</CardTitle>
              <p className="text-[13px] text-text-muted">Oldest requests should be cleared first</p>
            </div>
            <LinkButton to="/requests" variant="ghost" size="sm">
              View all <ArrowRight className="size-4" />
            </LinkButton>
          </CardHeader>
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">No pending registration requests.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{r.factory.name}</p>
                    <p className="text-xs text-text-muted">
                      {r.factory.district} · {r.contact.fullName} · submitted {daysAgo(r.submittedAt).toLowerCase()}
                    </p>
                  </div>
                  <LinkButton to={`/requests/${r.id}`} variant="secondary" size="sm">
                    Review
                  </LinkButton>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="text-base">Factories by district</CardTitle>
              <p className="text-[13px] text-text-muted">Where Harboost is running</p>
            </div>
          </CardHeader>
          <ul className="space-y-3">
            {byDistrict.map((d) => (
              <li key={d.district} className="grid grid-cols-[6.5rem_1fr_1.5rem] items-center gap-3 text-sm">
                <span className="truncate text-text-muted">{d.district}</span>
                <div className="h-2 rounded-full bg-border" title={`${d.district}: ${d.count}`}>
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(d.count / districtMax) * 100}%` }} />
                </div>
                <span className="tabular text-right font-medium text-text">{d.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
