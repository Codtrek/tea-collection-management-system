import { PLATFORM_STAFF_COUNT } from './mock'
import { ROLE_LABELS, type Factory, type FactoryRole, type RegistrationRequest } from './types'

export const totalUsersOf = (f: Factory) => Object.values(f.userCounts).reduce((a, b) => a + b, 0)

export function selectPlatformStats(factories: Factory[], requests: RegistrationRequest[]) {
  const active = factories.filter((f) => f.status === 'active').length
  const suspended = factories.length - active
  const pending = requests.filter((r) => r.status === 'pending').length
  const factoryUsers = factories.reduce((sum, f) => sum + totalUsersOf(f), 0)
  const estates = factories.reduce((sum, f) => sum + f.estates, 0)
  const routes = factories.reduce((sum, f) => sum + f.routes, 0)
  return {
    registeredFactories: factories.length,
    activeFactories: active,
    suspendedFactories: suspended,
    pendingRequests: pending,
    totalUsers: factoryUsers + PLATFORM_STAFF_COUNT,
    estates,
    routes,
  }
}

export function selectUsersByRole(factories: Factory[]) {
  const roles = Object.keys(ROLE_LABELS) as FactoryRole[]
  return roles
    .map((role) => ({
      role,
      label: ROLE_LABELS[role],
      count: factories.reduce((sum, f) => sum + f.userCounts[role], 0),
    }))
    .sort((a, b) => b.count - a.count)
}

export function selectMonthlyRegistrations(factories: Factory[], months = 6, now = new Date()) {
  const buckets: { key: string; label: string; count: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ key, label: d.toLocaleString('en-US', { month: 'short' }), count: 0 })
  }
  for (const f of factories) {
    const b = buckets.find((x) => x.key === f.registeredAt.slice(0, 7))
    if (b) b.count++
  }
  return buckets
}

export function selectFactoriesByDistrict(factories: Factory[]) {
  const map = new Map<string, number>()
  for (const f of factories) map.set(f.profile.district, (map.get(f.profile.district) ?? 0) + 1)
  return [...map.entries()].map(([district, count]) => ({ district, count })).sort((a, b) => b.count - a.count)
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatNumber = (n: number) => n.toLocaleString('en-US')

export function daysAgo(iso: string, now = new Date()) {
  const diff = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}
