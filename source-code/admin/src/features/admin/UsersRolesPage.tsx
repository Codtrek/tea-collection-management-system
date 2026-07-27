import { useState } from 'react'
import { KeyRound, Pencil, UserX } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminGuard } from './AdminGuard'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTable, RowAction, type Column } from '@/components/data/DataTable'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { DEFAULT_PERMISSIONS } from '@/context/permissions'
import type { ModuleKey, PermissionLevel, Role } from '@/types'
import { formatDateTime } from '@/lib/format'

/*
  ADM-02 — system users + the configurable permission matrix (§8.1.5
  "customize role-based privileges"). The matrix edits the same data-driven
  model every screen reads via useAuth().can() — changing it here is the
  whole reason no screen hardcodes role checks.
*/

interface SystemUser {
  id: string
  name: string
  role: Role
  email: string
  status: 'Active' | 'Suspended'
  lastLogin: string
}

/* Only workflow-facing roles appear — other employee types are HR-only records without login. */
const USERS: SystemUser[] = [
  { id: 'USR-001', name: 'A. Bandara', role: 'Administrator', email: 'admin@harboost.lk', status: 'Active', lastLogin: '2026-07-18T08:12:00' },
  { id: 'USR-002', name: 'S. Fernando', role: 'Officer', email: 'officer@harboost.lk', status: 'Active', lastLogin: '2026-07-18T07:40:00' },
  { id: 'USR-003', name: 'R. Jayasuriya', role: 'Manager', email: 'manager@harboost.lk', status: 'Active', lastLogin: '2026-07-17T16:55:00' },
  { id: 'USR-004', name: 'K. Perera', role: 'Officer', email: 'kperera@harboost.lk', status: 'Suspended', lastLogin: '2026-06-30T11:20:00' },
]

/** Matrix modules per the doc's example row. */
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
  const [tab, setTab] = useState('users')
  const [resetting, setResetting] = useState<SystemUser | null>(null)
  const [suspending, setSuspending] = useState<SystemUser | null>(null)
  const [savingMatrix, setSavingMatrix] = useState(false)
  const [confirmMatrix, setConfirmMatrix] = useState(false)
  const [matrix, setMatrix] = useState(() =>
    structuredClone(DEFAULT_PERMISSIONS) as Record<Role, Record<ModuleKey, PermissionLevel>>,
  )
  const [search, setSearch] = useState('')

  const userColumns: Column<SystemUser>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div>
          <p className="font-medium text-text">{u.name}</p>
          <p className="text-xs text-text-muted">{u.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role' },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <StatusBadge tone={u.status === 'Active' ? 'success' : 'warning'}>{u.status}</StatusBadge>,
    },
    { key: 'lastLogin', header: 'Last login', render: (u) => <span className="tabular text-xs">{formatDateTime(u.lastLogin)}</span> },
  ]

  const users = USERS.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <AdminGuard>
      <PageHeader
        title="Users & Roles"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Administration' }, { label: 'Users & Roles' }]}
        actions={tab === 'permissions' ? <Button onClick={() => setConfirmMatrix(true)}>Save Permission Changes</Button> : undefined}
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

      {tab === 'users' && (
        <>
          <div className="mb-4 max-w-sm">
            <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DataTable
            columns={userColumns}
            rows={users}
            rowKey={(u) => u.id}
            actions={(u) => (
              <>
                <RowAction icon={<Pencil className="size-4" />} label="Edit access" onClick={() => toast(`Edit access for ${u.name} (demo)`)} />
                <RowAction icon={<KeyRound className="size-4" />} label="Reset password" onClick={() => setResetting(u)} />
                {u.status === 'Active' && (
                  <RowAction icon={<UserX className="size-4" />} label="Suspend" tone="danger" onClick={() => setSuspending(u)} />
                )}
              </>
            )}
          />
        </>
      )}

      {tab === 'permissions' && (
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
                            setMatrix((prev) => ({
                              ...prev,
                              [role]: { ...prev[role], [m.key]: e.target.value as PermissionLevel },
                            }))
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
            unrestricted account. Changes apply to every user with the role.
          </p>
        </div>
      )}

      {/* Reset flow sends a link — an admin never sets or sees another user's password. */}
      <LightConfirmModal
        open={!!resetting}
        onClose={() => setResetting(null)}
        onConfirm={() => {
          toast(`Password reset link emailed to ${resetting?.email}`)
          setResetting(null)
        }}
        title="Reset password"
        confirmLabel="Send Reset Link"
        message={
          <>
            Email a password reset link to <strong>{resetting?.name}</strong> ({resetting?.email}). You won't see or
            set their password — they choose it themselves.
          </>
        }
      />

      <LightConfirmModal
        open={!!suspending}
        onClose={() => setSuspending(null)}
        onConfirm={() => {
          toast(`${suspending?.name} suspended`, 'warning')
          setSuspending(null)
        }}
        tone="danger"
        title="Suspend user"
        confirmLabel="Suspend"
        message={
          <>
            <strong>{suspending?.name}</strong> loses portal access immediately. Their records and history remain
            intact; you can re-activate later.
          </>
        }
      />

      <LightConfirmModal
        open={confirmMatrix}
        onClose={() => setConfirmMatrix(false)}
        onConfirm={() => {
          setSavingMatrix(true)
          setTimeout(() => {
            toast('Permission matrix saved — audit entry recorded')
            setSavingMatrix(false)
            setConfirmMatrix(false)
          }, 600)
        }}
        loading={savingMatrix}
        title="Save permission changes"
        confirmLabel="Save Changes"
        message="Permission changes take effect for every user with the role at their next action, and are recorded in the audit log."
      />
    </AdminGuard>
  )
}
