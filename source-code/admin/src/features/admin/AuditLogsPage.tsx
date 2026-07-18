import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminGuard } from './AdminGuard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/lib/format'

/*
  ADM-04 — the single home for every audit entry the other modules generate.
  Read-only by design: logs are exportable, never editable, or the trail
  loses its integrity.
*/

interface AuditEntry {
  id: string
  timestamp: string
  user: string
  role: string
  action: string
  module: string
  record: string
  recordHref?: string
  details?: string
}

const LOGS: AuditEntry[] = [
  { id: 'AUD-1042', timestamp: '2026-07-18T08:05:00', user: 'S. Fernando', role: 'Officer', action: 'Logged provisional collection entry', module: 'Collection', record: 'GV-2026-0718', recordHref: '/collections/GV-2026-0718', details: 'Pending Agent Confirmation — phone-arranged pickup' },
  { id: 'AUD-1041', timestamp: '2026-07-17T15:44:00', user: 'A. Bandara', role: 'Administrator', action: 'Updated grade rates', module: 'Administration', record: 'Rates effective 01/07/2026', details: 'Super Rs. 185/kg · Normal Rs. 95/kg' },
  { id: 'AUD-1039', timestamp: '2026-07-15T11:30:00', user: 'A. Bandara', role: 'Administrator', action: 'Processed payroll run', module: 'Employee', record: 'July 2026', recordHref: '/employees/payroll', details: 'Rs. 1,444,725 across 27 employees' },
  { id: 'AUD-1036', timestamp: '2026-07-14T09:32:00', user: 'S. Fernando', role: 'Officer', action: 'Approved Advance Rs. 15,000', module: 'Employee', record: 'EMP-ADV-0231', recordHref: '/employees/advances', details: 'Salary advance approval' },
  { id: 'AUD-1034', timestamp: '2026-07-12T14:18:00', user: 'S. Fernando', role: 'Officer', action: 'Logged stock movement', module: 'Fertilizer', record: 'FB-2291', recordHref: '/fertilizer/FB-2291', details: 'Outgoing 60 kg Urea → Hilltop Estate (FR-2026-0038)' },
  { id: 'AUD-1031', timestamp: '2026-07-05T10:02:00', user: 'S. Fernando', role: 'Officer', action: 'Issued advance Rs. 50,000', module: 'Estate Owner', record: 'EADV-2026-0031', recordHref: '/estates/EST-0001', details: 'Green Valley Estate — pre-season labour' },
  { id: 'AUD-1027', timestamp: '2026-07-01T09:15:00', user: 'A. Bandara', role: 'Administrator', action: 'Processed settlement run', module: 'Estate Owner', record: 'June 2026', recordHref: '/estates/settlements', details: 'Rs. 1,207,464 across 2 estates' },
  { id: 'AUD-1025', timestamp: '2026-06-30T16:20:00', user: 'A. Bandara', role: 'Administrator', action: 'Suspended user', module: 'Administration', record: 'USR-004 (K. Perera)', details: 'Access revoked pending review' },
]

const MODULES = ['Employee', 'Estate Owner', 'Fertilizer', 'Collection', 'Reports', 'Administration']

export function AuditLogsPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const [user, setUser] = useState('')

  const rows = useMemo(
    () =>
      LOGS.filter((l) => {
        const q = search.toLowerCase()
        return (
          (l.action.toLowerCase().includes(q) || l.record.toLowerCase().includes(q) || (l.details ?? '').toLowerCase().includes(q)) &&
          (!module || l.module === module) &&
          (!user || l.user === user)
        )
      }),
    [search, module, user],
  )

  const columns: Column<AuditEntry>[] = [
    { key: 'timestamp', header: 'Timestamp', render: (l) => <span className="tabular text-xs">{formatDateTime(l.timestamp)}</span> },
    {
      key: 'user',
      header: 'User',
      render: (l) => (
        <div>
          <p className="text-sm font-medium text-text">{l.user}</p>
          <p className="text-xs text-text-muted">{l.role}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <div>
          <p className="text-sm text-text">{l.action}</p>
          {l.details && <p className="text-xs text-text-muted">{l.details}</p>}
        </div>
      ),
    },
    { key: 'module', header: 'Module' },
    {
      key: 'record',
      header: 'Record',
      render: (l) =>
        l.recordHref ? (
          <Link to={l.recordHref} onClick={(e) => e.stopPropagation()} className="id text-xs font-medium text-primary underline-offset-2 hover:underline">
            {l.record}
          </Link>
        ) : (
          <span className="id text-xs">{l.record}</span>
        ),
    },
  ]

  return (
    <AdminGuard>
      <PageHeader
        title="Audit Logs"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Administration' }, { label: 'Audit Logs' }]}
        description="Read-only. Every processed / approved / updated entry across the system lives here."
        actions={
          <Button variant="secondary" onClick={() => toast('Audit log exported (demo)')}>
            <FileDown className="size-4" /> Export CSV / PDF
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <Input placeholder="Search action, record or details…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          placeholder="All modules"
          value={module}
          onChange={(e) => setModule(e.target.value)}
          options={MODULES.map((m) => ({ value: m, label: m }))}
        />
        <Select
          placeholder="All users"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          options={[...new Set(LOGS.map((l) => l.user))].map((u) => ({ value: u, label: u }))}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        pageSize={10}
        emptyState={<EmptyState title="No audit entries match" description="Adjust the filters to see more of the trail." />}
      />
    </AdminGuard>
  )
}
