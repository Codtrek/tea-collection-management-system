import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Users, Wallet, Leaf, Sprout, Search as SearchIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/data/EmptyState'

interface Result {
  type: 'Employees' | 'Estate Owners' | 'Collection Records' | 'Fertilizer Batches'
  icon: typeof Users
  label: string
  meta: string
  to: string
  badge?: { tone: BadgeTone; text: string }
}

const ALL_RESULTS: Result[] = [
  { type: 'Estate Owners', icon: Wallet, label: 'Green Valley Estate', meta: 'Owner: K. Perera · Nuwara Eliya · Route 3', to: '/estates', badge: { tone: 'success', text: 'Active' } },
  { type: 'Collection Records', icon: Leaf, label: 'GV-2026-0714', meta: '210 kg · Super grade · 14/07/2026', to: '/collections', badge: { tone: 'success', text: 'Confirmed' } },
  { type: 'Employees', icon: Users, label: 'K. Perera', meta: 'Factory Officer · Active · Hired 12/03/2024', to: '/employees', badge: { tone: 'success', text: 'Active' } },
  { type: 'Fertilizer Batches', icon: Sprout, label: 'FB-2291', meta: 'Urea Fertilizer · 500 kg · Expires 01/12/2026', to: '/fertilizer', badge: { tone: 'warning', text: 'Expiring' } },
]

export function SearchResultsPage() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''

  const results = useMemo(() => {
    const q = query.toLowerCase()
    return ALL_RESULTS.filter((r) => r.label.toLowerCase().includes(q) || r.meta.toLowerCase().includes(q) || q === '')
  }, [query])

  const groups = useMemo(() => {
    const map = new Map<string, Result[]>()
    for (const r of results) {
      const arr = map.get(r.type) ?? []
      arr.push(r)
      map.set(r.type, arr)
    }
    return [...map.entries()]
  }, [results])

  return (
    <div>
      <PageHeader
        title={`Results for "${query}"`}
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Search' }]}
        description={`${results.length} result${results.length === 1 ? '' : 's'} across modules`}
      />

      {results.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="size-6" strokeWidth={1.5} />}
          title={`No results for "${query}"`}
          description="Check your spelling or broaden your filters."
          action={<Link to="/dashboard" className="text-[13px] font-medium text-primary hover:underline">Clear search</Link>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([type, rows]) => (
            <div key={type}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{type}</p>
              <Card className="p-0">
                <ul className="divide-y divide-border">
                  {rows.map((r) => (
                    <li key={r.label}>
                      <Link to={r.to} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                        <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-brand-soft text-primary">
                          <r.icon className="size-4" strokeWidth={1.5} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="id block text-sm font-medium text-text">{r.label}</span>
                          <span className="block truncate text-xs text-text-muted">{r.meta}</span>
                        </span>
                        {r.badge && <StatusBadge tone={r.badge.tone}>{r.badge.text}</StatusBadge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
