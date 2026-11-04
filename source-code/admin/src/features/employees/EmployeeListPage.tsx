import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Pencil, UserX, Users, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as employeesService from '@/services/employees'
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
  const queryClient = useQueryClient()
  const canManage = can('employees', 'approve') // Add / Edit / Deactivate are Administrator-only (§8.1.5)

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [deactivating, setDeactivating] = useState<Employee | null>(null)

  const {
    data: employees,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ['employees'], queryFn: employeesService.list })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => employeesService.deactivate(id),
    onSuccess: (updated) => {
      toast(`${updated.name} deactivated`, 'warning')
      setDeactivating(null)
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not deactivate this employee', 'danger'),
  })

  const rows = useMemo(
    () =>
      (employees ?? []).filter((e) => {
        const q = search.toLowerCase()
        return (
          (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) &&
          (!role || e.role === role) &&
          (!status || e.status === status)
        )
      }),
    [employees, search, role, status],
  )

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Couldn't load employees" description="Something went wrong fetching the employee roster." onRetry={() => void refetch()} />
  }

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
          options={[...new Set((employees ?? []).map((e) => e.role))].map((r) => ({ value: r, label: r }))}
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
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating.id)}
        loading={deactivateMutation.isPending}
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
