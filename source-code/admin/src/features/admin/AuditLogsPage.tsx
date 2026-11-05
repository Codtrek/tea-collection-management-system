import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileDown, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminGuard } from './AdminGuard'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import * as adminService from '@/services/admin'
import { AUDIT_MODULES, type AuditEntry } from './types'
import { formatDateTime } from '@/lib/format'

/*
  ADM-04 — the single home for every audit entry the other modules generate,
  now backed by the real `audit_logs` table (GET /audit). Read-only by design:
  logs are exportable, never editable, or the trail loses its integrity. The
  endpoint is Administrator-only server-side too, matching this AdminGuard.
*/
export function AuditLogsPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const [user, setUser] = useState('')

  const {
    data: logs,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['audit', 'logs'],
    queryFn: () => adminService.getAuditLogs(),
  })

  const rows = useMemo(
    () =>
      (logs ?? []).filter((l) => {
        const q = search.toLowerCase()
        return (
          (l.action.toLowerCase().includes(q) ||
            (l.record ?? '').toLowerCase().includes(q) ||
            (l.details ?? '').toLowerCase().includes(q)) &&
          (!module || l.module === module) &&
          (!user || l.user === user)
        )
      }),
    [logs, search, module, user],
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
        l.record && l.recordHref ? (
          <Link to={l.recordHref} onClick={(e) => e.stopPropagation()} className="id text-xs font-medium text-primary underline-offset-2 hover:underline">
            {l.record}
          </Link>
        ) : (
          <span className="id text-xs">{l.record ?? '—'}</span>
        ),
    },
  ]

  const users = useMemo(() => [...new Set((logs ?? []).map((l) => l.user))], [logs])

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

      {isPending ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
        </div>
      ) : isError || !logs ? (
        <ErrorState
          title="Couldn't load the audit trail"
          description="Something went wrong fetching audit entries."
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
            <Input placeholder="Search action, record or details…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select
              placeholder="All modules"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              options={AUDIT_MODULES.map((m) => ({ value: m, label: m }))}
            />
            <Select
              placeholder="All users"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              options={users.map((u) => ({ value: u, label: u }))}
            />
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(l) => l.id}
            pageSize={10}
            emptyState={<EmptyState title="No audit entries match" description="Adjust the filters to see more of the trail." />}
          />
        </>
      )}
    </AdminGuard>
  )
}
