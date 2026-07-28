import { useState } from 'react'
import { KeyRound, Loader2, UserX } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminGuard } from './AdminGuard'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { ErrorState } from '@/components/data/ErrorState'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import * as adminService from '@/services/admin'
import type { ModuleKey, PermissionLevel, Role } from '@/types'
import type { PermissionEntry, PermissionMatrix, SystemUser } from './types'
import { formatDateTime } from '@/lib/format'

/*
  ADM-02 — system users + the configurable permission matrix (§8.1.5). The
  matrix edits the same data-driven model every screen reads via
  useAuth().can(), now persisted server-side (role_permissions) — changing it
  here is the whole reason no screen hardcodes role checks. Changes take effect
  for a user at their next login (their permission map is baked into the login
  response).
*/

/** Matrix modules shown per the doc's example row (the full set is 11; these are edited here). */
const MATRIX_MODULES: Array<{ key: ModuleKey; label: string }> = [
  { key: 'employees', label: 'Employee' },
  { key: 'estateOwners', label: 'Estate Owner' },
  { key: 'fertilizer', label: 'Fertilizer' },
  { key: 'collection', label: 'Collection' },
  { key: 'reports', label: 'Reports' },
  { key: 'administration', label: 'Administration' },
]

const LEVELS: Array<{ value: PermissionLevel; label: string }> = [
  { value: 'none', label: 'No Access' },
  { value: 'view', label: 'View' },
  { value: 'edit', label: 'View + Edit' },
  { value: 'approve', label: 'Approve' },
]

const TABS = [
  { id: 'users', label: 'System Users' },
  { id: 'permissions', label: 'Role Permissions' },
]

export function UsersRolesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('users')
  const [resetting, setResetting] = useState<SystemUser | null>(null)
  const [suspending, setSuspending] = useState<SystemUser | null>(null)
  const [confirmMatrix, setConfirmMatrix] = useState(false)
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null)
  const [seededFrom, setSeededFrom] = useState<PermissionMatrix | null>(null)
  const [search, setSearch] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminService.getSystemUsers,
  })

  const permQuery = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: adminService.getPermissionMatrix,
  })

  // Seed the editable matrix from server state when it arrives (and on refetch).
  // React's "adjust state during render" pattern — no effect (which the
  // set-state-in-effect lint forbids).
  if (permQuery.data && permQuery.data !== seededFrom) {
    setSeededFrom(permQuery.data)
    setMatrix(structuredClone(permQuery.data))
  }

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminService.suspendUser(id),
    onSuccess: (u) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast(`${u.name} suspended`, 'warning')
      setSuspending(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not suspend user', 'danger'),
  })

  const resetMutation = useMutation({
    mutationFn: (id: string) => adminService.resetPassword(id),
    onSuccess: () => {
      toast(`Password reset link emailed to ${resetting?.name}`)
      setResetting(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not send reset link', 'danger'),
  })

  const saveMatrixMutation = useMutation({
    mutationFn: () => {
      // Flatten the edited (non-Administrator) cells the UI shows into entries.
      const entries: PermissionEntry[] = []
      if (matrix) {
        for (const role of Object.keys(matrix) as Role[]) {
          if (role === 'Administrator') continue
          for (const m of MATRIX_MODULES) {
            entries.push({ role, module: m.key, level: matrix[role][m.key] })
          }
        }
      }
      return adminService.updatePermissions(entries)
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] })
      setMatrix(structuredClone(updated))
      toast('Permission matrix saved — audit entry recorded')
      setConfirmMatrix(false)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not save permissions', 'danger'),
  })

  const userColumns: Column<SystemUser>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div>
          <p className="font-medium text-text">{u.name}</p>
          <p className="text-xs text-text-muted">{u.phone}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role' },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <StatusBadge tone={u.status === 'Active' ? 'success' : 'warning'}>{u.status}</StatusBadge>,
    },
    {
      key: 'lastLogin',
      header: 'Last login',
      render: (u) => <span className="tabular text-xs">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</span>,
    },
  ]

  const users = (usersQuery.data ?? []).filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search),
  )

  return (
    <AdminGuard>
      <PageHeader
        title="Users & Roles"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Administration' }, { label: 'Users & Roles' }]}
        actions={
          tab === 'permissions' ? (
            <Button onClick={() => setConfirmMatrix(true)} disabled={!matrix}>
              Save Permission Changes
            </Button>
          ) : undefined
        }
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

      {tab === 'users' &&
        (usersQuery.isPending ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
          </div>
        ) : usersQuery.isError ? (
          <ErrorState title="Couldn't load users" onRetry={() => void usersQuery.refetch()} />
        ) : (
          <>
            <div className="mb-4 max-w-sm">
              <Input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DataTable
              columns={userColumns}
              rows={users}
              rowKey={(u) => u.id}
              actions={(u) => (
                <>
                  <RowAction icon={<KeyRound className="size-4" />} label="Reset password" onClick={() => setResetting(u)} />
                  {u.status === 'Active' && (
                    <RowAction icon={<UserX className="size-4" />} label="Suspend" tone="danger" onClick={() => setSuspending(u)} />
                  )}
                </>
              )}
            />
          </>
        ))}

      {tab === 'permissions' &&
        (permQuery.isPending || !matrix ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
          </div>
        ) : permQuery.isError ? (
          <ErrorState title="Couldn't load permissions" onRetry={() => void permQuery.refetch()} />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-surface-sunken">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-text-muted">Role</th>
                    {MATRIX_MODULES.map((m) => (
                      <th key={m.key} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-text-muted">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(matrix) as Role[]).map((role) => (
                    <tr key={role} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-text">{role}</td>
                      {MATRIX_MODULES.map((m) => (
                        <td key={m.key} className="px-3 py-2">
                          <Select
                            aria-label={`${role} — ${m.label} permission`}
                            value={matrix[role][m.key]}
                            disabled={role === 'Administrator'}
                            onChange={(e) =>
                              setMatrix((prev) =>
                                prev
                                  ? { ...prev, [role]: { ...prev[role], [m.key]: e.target.value as PermissionLevel } }
                                  : prev,
                              )
                            }
                            options={LEVELS}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border px-4 py-3 text-xs text-text-muted">
              The Administrator role keeps full access and can't be edited — the factory always needs at least one
              unrestricted account. Changes apply to every user with the role at their next login.
            </p>
          </div>
        ))}

      {/* Reset flow sends a link — an admin never sets or sees another user's password. */}
      <LightConfirmModal
        open={!!resetting}
        onClose={() => setResetting(null)}
        onConfirm={() => resetting && resetMutation.mutate(resetting.id)}
        loading={resetMutation.isPending}
        title="Reset password"
        confirmLabel="Send Reset Link"
        message={
          <>
            Email a password reset link to <strong>{resetting?.name}</strong> ({resetting?.phone}). You won't see or
            set their password — they choose it themselves.
          </>
        }
      />

      <LightConfirmModal
        open={!!suspending}
        onClose={() => setSuspending(null)}
        onConfirm={() => suspending && suspendMutation.mutate(suspending.id)}
        loading={suspendMutation.isPending}
        tone="danger"
        title="Suspend user"
        confirmLabel="Suspend"
        message={
          <>
            <strong>{suspending?.name}</strong> loses portal access immediately and can't log in until reactivated.
            Their records and history remain intact.
          </>
        }
      />

      <LightConfirmModal
        open={confirmMatrix}
        onClose={() => setConfirmMatrix(false)}
        onConfirm={() => saveMatrixMutation.mutate()}
        loading={saveMatrixMutation.isPending}
        title="Save permission changes"
        confirmLabel="Save Changes"
        message="Permission changes take effect for every user with the role at their next login, and are recorded in the audit log."
      />
    </AdminGuard>
  )
}
