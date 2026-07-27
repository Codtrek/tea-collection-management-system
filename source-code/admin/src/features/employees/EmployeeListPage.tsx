import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, UserX, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { EMPLOYEES } from './data'
import type { Employee, EmployeeStatus } from './types'
import { formatDate, initials } from '@/lib/format'

const statusTone: Record<EmployeeStatus, BadgeTone> = {
  Active: 'success',
  Suspended: 'warning',
  Inactive: 'danger',
}

export function EmployeeListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const canManage = can('employees', 'edit') // Add / Deactivate are Administrator-only (§8.1.5)

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [deactivating, setDeactivating] = useState<Employee | null>(null)

  const rows = useMemo(
    () =>
      EMPLOYEES.filter((e) => {
        const q = search.toLowerCase()
        return (
          (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) &&
          (!role || e.role === role) &&
          (!status || e.status === status)
        )
      }),
    [search, role, status],
  )

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Employee',
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-primary">
            {initials(e.name)}
          </span>
          <div>
            <p className="font-medium text-text">{e.name}</p>
            <p className="id text-xs text-text-muted">{e.id}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role' },
    { key: 'department', header: 'Department' },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge tone={statusTone[e.status]}>{e.status}</StatusBadge> },
    { key: 'hireDate', header: 'Hire Date', render: (e) => formatDate(e.hireDate) },
  ]

  return (
    <div>
      <PageHeader
        title="Employees"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Employees' }]}
        actions={
          canManage ? (
            <Button onClick={() => navigate('/employees/new')}>
              <Plus className="size-4" /> Add Employee
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <Input placeholder="Search name or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          placeholder="All roles"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[...new Set(EMPLOYEES.map((e) => e.role))].map((r) => ({ value: r, label: r }))}
        />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={['Active', 'Suspended', 'Inactive'].map((s) => ({ value: s, label: s }))}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        selectable={canManage}
        onRowClick={(e) => navigate(`/employees/${e.id}`)}
        emptyState={
          <EmptyState
            icon={<Users className="size-6" strokeWidth={1.5} />}
            title="Add your first employee"
            description="No employees match your filters yet."
            action={canManage ? <Button size="sm" onClick={() => navigate('/employees/new')}>Add Employee</Button> : undefined}
          />
        }
        actions={(e) => (
          <>
            <RowAction icon={<Eye className="size-4" />} label="View" onClick={() => navigate(`/employees/${e.id}`)} />
            {canManage && <RowAction icon={<Pencil className="size-4" />} label="Edit" onClick={() => navigate(`/employees/${e.id}/edit`)} />}
            {canManage && <RowAction icon={<UserX className="size-4" />} label="Deactivate" tone="danger" onClick={() => setDeactivating(e)} />}
          </>
        )}
      />

      {/* EMP-05 Deactivate */}
      <LightConfirmModal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={() => {
          toast(`${deactivating?.name} deactivated`, 'warning')
          setDeactivating(null)
        }}
        tone="danger"
        title="Deactivate employee"
        confirmLabel="Deactivate"
        message={
          <>
            Deactivating <strong>{deactivating?.name}</strong> will revoke system access and remove them from active
            rosters. Historical attendance and salary records remain intact.
          </>
        }
      >
        <Select
          label="Reason"
          placeholder="Select a reason"
          options={[
            { value: 'resigned', label: 'Resigned' },
            { value: 'terminated', label: 'Terminated' },
            { value: 'retired', label: 'Retired' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </LightConfirmModal>
    </div>
  )
}
