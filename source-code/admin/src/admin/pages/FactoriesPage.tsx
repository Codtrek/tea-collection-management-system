import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAdminStore } from '../data/AdminStore'
import { formatDate, formatNumber, totalUsersOf } from '../data/selectors'
import { DISTRICTS, type Factory, type FactoryStatus } from '../data/types'
import { AdminStatusBadge } from '../components/AdminStatusBadge'
import { LinkButton } from '../components/LinkButton'

type Tab = FactoryStatus | 'all'

const DISTRICT_OPTIONS = [{ value: 'all', label: 'All districts' }, ...DISTRICTS.map((d) => ({ value: d, label: d }))]

const columns: Column<Factory>[] = [
  {
    key: 'factory',
    header: 'Factory',
    render: (f) => (
      <>
        <Link to={`/factories/${f.id}`} className="font-medium text-text hover:underline">
          {f.profile.name}
        </Link>
        <p className="text-xs text-text-muted">
          {f.id} · {f.profile.businessRegNo}
        </p>
      </>
    ),
  },
  { key: 'district', header: 'District', render: (f) => f.profile.district },
  {
    key: 'admin',
    header: 'Administrator',
    render: (f) => (
      <>
        <p>{f.admin.fullName}</p>
        <p className="text-xs text-text-muted">{f.admin.phone}</p>
      </>
    ),
  },
  { key: 'estates', header: 'Estates', align: 'right', render: (f) => formatNumber(f.estates) },
  { key: 'users', header: 'Users', align: 'right', render: (f) => formatNumber(totalUsersOf(f)) },
  { key: 'registered', header: 'Registered', render: (f) => formatDate(f.registeredAt) },
  { key: 'status', header: 'Status', render: (f) => <AdminStatusBadge status={f.status} /> },
]

export default function FactoriesPage() {
  const { factories } = useAdminStore()
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [district, setDistrict] = useState('all')

  const counts = useMemo(
    () => ({
      all: factories.length,
      active: factories.filter((f) => f.status === 'active').length,
      suspended: factories.filter((f) => f.status === 'suspended').length,
    }),
    [factories],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return factories
      .filter((f) => tab === 'all' || f.status === tab)
      .filter((f) => district === 'all' || f.profile.district === district)
      .filter(
        (f) =>
          !q ||
          [f.profile.name, f.profile.businessRegNo, f.admin.fullName, f.id].some((v) => v.toLowerCase().includes(q)),
      )
  }, [factories, tab, district, query])

  return (
    <>
      <PageHeader
        title="Factories"
        description="Every tea factory on the platform."
        actions={
          <LinkButton to="/factories/new">
            <Plus className="size-4" /> Register factory
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Tabs
          tabs={(['all', 'active', 'suspended'] as Tab[]).map((t) => ({
            id: t,
            label: `${t[0].toUpperCase()}${t.slice(1)} (${counts[t]})`,
          }))}
          active={tab}
          onChange={(v) => setTab(v as Tab)}
          className="overflow-x-auto"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="sm:w-72">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, BR no, administrator…"
              aria-label="Search factories"
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
        rowKey={(f) => f.id}
        pageSize={10}
        actions={(f) => (
          <LinkButton to={`/factories/${f.id}`} variant="ghost" size="sm">
            Manage
          </LinkButton>
        )}
        emptyState={
          <EmptyState
            icon={<Building2 className="size-6" />}
            title="No factories found"
            description="No factories match these filters."
          />
        }
      />
    </>
  )
}
