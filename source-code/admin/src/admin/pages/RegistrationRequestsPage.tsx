import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardCheck, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAdminStore } from '../data/AdminStore'
import { daysAgo, formatDate } from '../data/selectors'
import { DISTRICTS, type RegistrationRequest, type RequestStatus } from '../data/types'
import { AdminStatusBadge } from '../components/AdminStatusBadge'
import { LinkButton } from '../components/LinkButton'

type Tab = RequestStatus | 'all'
const TABS: { value: Tab; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

const DISTRICT_OPTIONS = [{ value: 'all', label: 'All districts' }, ...DISTRICTS.map((d) => ({ value: d, label: d }))]

const columns: Column<RegistrationRequest>[] = [
  {
    key: 'factory',
    header: 'Factory',
    render: (r) => (
      <>
        <p className="font-medium text-text">{r.factory.name}</p>
        <p className="text-xs text-text-muted">
          {r.id} · {r.factory.businessRegNo}
        </p>
      </>
    ),
  },
  { key: 'district', header: 'District', render: (r) => r.factory.district },
  {
    key: 'contact',
    header: 'Contact person',
    render: (r) => (
      <>
        <p>{r.contact.fullName}</p>
        <p className="text-xs text-text-muted">{r.contact.phone}</p>
      </>
    ),
  },
  {
    key: 'submitted',
    header: 'Submitted',
    render: (r) => (
      <>
        <p>{formatDate(r.submittedAt)}</p>
        {r.status === 'pending' && <p className="text-xs text-text-muted">{daysAgo(r.submittedAt)}</p>}
      </>
    ),
  },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
]

export default function RegistrationRequestsPage() {
  const { requests } = useAdminStore()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('status') as Tab) ?? 'pending'
  const [query, setQuery] = useState('')
  const [district, setDistrict] = useState('all')

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, approved: 0, rejected: 0, all: requests.length }
    for (const r of requests) c[r.status]++
    return c
  }, [requests])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return requests
      .filter((r) => tab === 'all' || r.status === tab)
      .filter((r) => district === 'all' || r.factory.district === district)
      .filter(
        (r) =>
          !q ||
          [r.factory.name, r.factory.businessRegNo, r.contact.fullName, r.id].some((v) => v.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        tab === 'pending' ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt),
      )
  }, [requests, tab, district, query])

  return (
    <>
      <PageHeader
        title="Registration requests"
        description="Factories that applied to join Harboost. Approving creates the factory and its administrator account."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Tabs
          tabs={TABS.map((t) => ({ id: t.value, label: `${t.label} (${counts[t.value]})` }))}
          active={tab}
          onChange={(v) => setParams(v === 'pending' ? {} : { status: v })}
          className="overflow-x-auto"
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="sm:w-72">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search factory, BR no, contact…"
              aria-label="Search requests"
              leadingIcon={<Search className="size-4" />}
            />
          </div>
          <div className="sm:w-44">
            <Select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              options={DISTRICT_OPTIONS}
              aria-label="Filter by district"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={10}
        actions={(r) => (
          <LinkButton to={`/requests/${r.id}`} variant={r.status === 'pending' ? 'primary' : 'ghost'} size="sm">
            {r.status === 'pending' ? 'Review' : 'View'}
          </LinkButton>
        )}
        emptyState={
          <EmptyState
            icon={<ClipboardCheck className="size-6" />}
            title={tab === 'pending' && !query && district === 'all' ? "You're all caught up" : 'No requests found'}
            description={
              tab === 'pending' && !query && district === 'all'
                ? 'There are no pending requests.'
                : 'No requests match these filters.'
            }
          />
        }
      />
    </>
  )
}
