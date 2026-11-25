import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Link2, Loader2, LockOpen, Pencil, Search, UserCheck, UserPlus, UserX } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Tooltip } from '@/components/ui/Tooltip'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ErrorState } from '@/components/data/ErrorState'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import * as adminService from '@/services/admin'
import type { Role } from '@/types'
import type { IssuedPassword, LinkSuggestion, SystemUser, SystemUserStatus } from './types'
import { AddUserModal, EditUserModal, TemporaryPasswordModal } from './SystemUserModals'

/*
  ADM-02 System Users (Users-Roles-Addendum §5). Portal logins only: collection agents' mobile
  logins are managed from Employees. Every safety rule (own account, last Administrator, who may
  assign Administrator) is enforced by the server; the server also sends each row's reasons, so
  the controls here are disabled with the same explanation the server would give.
*/

const statusTone: Record<SystemUserStatus, BadgeTone> = {
  Active: 'success',
  Inactive: 'neutral',
  Locked: 'warning',
}

type Confirm =
  | { kind: 'reset'; user: SystemUser }
  | { kind: 'deactivate'; user: SystemUser }
  | { kind: 'reactivate'; user: SystemUser }
  | { kind: 'unlock'; user: SystemUser }
  | { kind: 'unlink'; user: SystemUser }
  | { kind: 'link'; suggestion: LinkSuggestion }

export function SystemUsersTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'' | Role>('')
  const [status, setStatus] = useState<'' | SystemUserStatus>('')
  const [linked, setLinked] = useState<'' | 'linked' | 'unlinked'>('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SystemUser | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [reason, setReason] = useState('')
  const [issued, setIssued] = useState<{ title: string; value: IssuedPassword } | null>(null)

  const usersQuery = useQuery({ queryKey: ['admin', 'users'], queryFn: adminService.getSystemUsers })
  const suggestions = useQuery({ queryKey: ['admin', 'users', 'links'], queryFn: adminService.getLinkSuggestions })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
  const fail = (fallback: string) => (err: unknown) => toast(err instanceof ApiError ? err.message : fallback, 'danger')

  const act = useMutation({
    gcTime: 0, // a reset's response carries a temporary password: don't keep it around
    mutationFn: async (c: Confirm): Promise<{ c: Confirm; issued?: IssuedPassword }> => {
      switch (c.kind) {
        case 'reset':
          return { c, issued: await adminService.resetPassword(c.user.id) }
        case 'deactivate':
          await adminService.deactivateUser(c.user.id, reason.trim() || undefined)
          return { c }
        case 'reactivate':
          await adminService.reactivateUser(c.user.id)
          return { c }
        case 'unlock':
          await adminService.unlockUser(c.user.id)
          return { c }
        case 'unlink':
          await adminService.unlinkUser(c.user.id)
          return { c }
        case 'link':
          await adminService.linkUser(c.suggestion.userId, c.suggestion.employeeId)
          return { c }
      }
    },
    onSuccess: ({ c, issued: pw }) => {
      refresh()
      setConfirm(null)
      setReason('')
      if (pw) setIssued({ title: 'New temporary password', value: pw })
      const who = c.kind === 'link' ? c.suggestion.userName : c.user.name
      const done: Record<Confirm['kind'], string> = {
        reset: `Password reset for ${who}; they were signed out`,
        deactivate: `${who} deactivated and signed out`,
        reactivate: `${who} reactivated`,
        unlock: `${who} unlocked`,
        unlink: `${who} unlinked from their employee record`,
        link: `${who} linked to ${c.kind === 'link' ? c.suggestion.employeeName : ''}`,
      }
      toast(done[c.kind])
    },
    onError: fail('Could not complete the action'),
  })

  if (usersQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (usersQuery.isError) {
    return <ErrorState title="Couldn't load users" onRetry={() => void usersQuery.refetch()} />
  }

  const q = search.trim().toLowerCase()
  const rows = usersQuery.data.filter(
    (u) =>
      (!q || u.name.toLowerCase().includes(q) || u.phone.includes(q) || (u.email ?? '').toLowerCase().includes(q)) &&
      (!role || u.role === role) &&
      (!status || u.status === status) &&
      (!linked || (linked === 'linked') === !!u.linkedEmployee),
  )

  const columns: Column<SystemUser>[] = [
    {
      key: 'name',
      header: 'User',
      minWidth: 170,
      render: (u) => (
        <div>
          <p className="font-medium text-text">
            {u.name}
            {u.isSelf && <span className="ml-1.5 text-xs font-normal text-text-muted">(you)</span>}
          </p>
          <p className="tabular text-xs text-text-muted">{u.phone}</p>
          {u.email && <p className="text-xs text-text-muted">{u.email}</p>}
        </div>
      ),
    },
    { key: 'role', header: 'Role' },
    {
      key: 'linkedEmployee',
      header: 'Linked employee',
      minWidth: 150,
      render: (u) =>
        u.linkedEmployee ? (
          <Link to={`/employees/${u.linkedEmployee.id}`} className="text-sm font-medium text-primary hover:underline">
            {u.linkedEmployee.name}
          </Link>
        ) : (
          <span className="text-sm text-text-muted">Not linked</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <div>
          <StatusBadge tone={statusTone[u.status]}>{u.status}</StatusBadge>
          {u.status === 'Locked' && u.lockedUntil && (
            <p className="tabular mt-1 text-xs text-text-muted">until {formatDateTime(u.lockedUntil)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last login',
      render: (u) => <span className="tabular text-xs">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</span>,
    },
  ]

  const pending = suggestions.data ?? []

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr]">
          <Input
            aria-label="Search users"
            placeholder="Search name, phone or email…"
            leadingIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            aria-label="Filter by role"
            value={role}
            onChange={(e) => setRole(e.target.value as '' | Role)}
            options={[
              { value: '', label: 'All roles' },
              { value: 'Administrator', label: 'Administrator' },
              { value: 'Manager', label: 'Manager' },
              { value: 'Officer', label: 'Officer' },
            ]}
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | SystemUserStatus)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
              { value: 'Locked', label: 'Locked' },
            ]}
          />
          <Select
            aria-label="Filter by employee link"
            value={linked}
            onChange={(e) => setLinked(e.target.value as '' | 'linked' | 'unlinked')}
            options={[
              { value: '', label: 'Linked or not' },
              { value: 'linked', label: 'Linked to an employee' },
              { value: 'unlinked', label: 'Not linked' },
            ]}
          />
        </div>
        <Button onClick={() => setAdding(true)} className="self-start xl:self-auto">
          <UserPlus className="size-4" aria-hidden />
          Add user
        </Button>
      </div>

      {pending.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-base font-semibold text-text-heading">Possible employee links</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            These logins have the same NIC as an employee record that has no login. Nothing is linked until you confirm
            each one.
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {pending.map((s) => (
              <li key={`${s.userId}:${s.employeeId}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-text">
                  <strong className="font-medium">{s.userName}</strong> → employee{' '}
                  <strong className="font-medium">{s.employeeName}</strong>
                  <span className="tabular ml-2 text-xs text-text-muted">NIC {s.nic}</span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'link', suggestion: s })}>
                  <Link2 className="size-4" aria-hidden />
                  Review link
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        emptyState={
          <p className="py-10 text-center text-sm text-text-muted">
            {usersQuery.data.length === 0 ? 'No portal users yet.' : 'No user matches these filters.'}
          </p>
        }
        actions={(u) => (
          <div className="flex flex-nowrap justify-end gap-0.5 whitespace-nowrap">
            <ActionButton icon={<Pencil className="size-4" />} label="Edit" reason={u.actions.edit} onClick={() => setEditing(u)} />
            <ActionButton
              icon={<KeyRound className="size-4" />}
              label="Reset password"
              reason={u.actions.resetPassword}
              onClick={() => setConfirm({ kind: 'reset', user: u })}
            />
            {u.status === 'Locked' && (
              <ActionButton
                icon={<LockOpen className="size-4" />}
                label="Unlock"
                reason={u.actions.unlock}
                onClick={() => setConfirm({ kind: 'unlock', user: u })}
              />
            )}
            {u.status === 'Inactive' ? (
              <ActionButton
                icon={<UserCheck className="size-4" />}
                label="Reactivate"
                reason={u.actions.reactivate}
                onClick={() => setConfirm({ kind: 'reactivate', user: u })}
              />
            ) : (
              <ActionButton
                icon={<UserX className="size-4" />}
                label="Deactivate"
                reason={u.actions.deactivate}
                onClick={() => setConfirm({ kind: 'deactivate', user: u })}
              />
            )}
          </div>
        )}
      />

      <p className="mt-3 text-xs text-text-muted">
        Collection agents sign in to the mobile app; their logins are managed from their employee record, so they
        aren’t listed here.
      </p>

      <AddUserModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(value) => {
          setAdding(false)
          refresh()
          setIssued({ title: `${value.user.name} added`, value })
        }}
      />

      <EditUserModal
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={(u) => {
          setEditing(null)
          refresh()
          toast(`${u.name} saved`)
        }}
        onUnlink={(u) => {
          setEditing(null)
          setConfirm({ kind: 'unlink', user: u })
        }}
      />

      <TemporaryPasswordModal issued={issued?.value ?? null} title={issued?.title ?? ''} onClose={() => setIssued(null)} />

      {confirm && (
        <LightConfirmModal
          open
          onClose={() => {
            setConfirm(null)
            setReason('')
          }}
          onConfirm={() => act.mutate(confirm)}
          loading={act.isPending}
          tone={confirm.kind === 'deactivate' ? 'danger' : 'default'}
          {...confirmCopy(confirm)}
        >
          {confirm.kind === 'deactivate' && (
            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor="deactivate-reason" className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Reason (optional)
              </label>
              <textarea
                id="deactivate-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>
          )}
        </LightConfirmModal>
      )}
    </div>
  )
}

function confirmCopy(c: Confirm): { title: string; confirmLabel: string; message: ReactNode } {
  switch (c.kind) {
    case 'reset':
      return {
        title: 'Reset password',
        confirmLabel: 'Reset password',
        message: (
          <>
            Issue a new temporary password for <strong>{c.user.name}</strong>? Their current password stops working and
            they are signed out everywhere. You’ll see the new password once, to give to them; they must change it at
            their next sign-in.
          </>
        ),
      }
    case 'deactivate':
      return {
        title: 'Deactivate user',
        confirmLabel: 'Deactivate',
        message: (
          <>
            <strong>{c.user.name}</strong> is signed out at once and can’t sign in until reactivated. Their records and
            history stay as they are.
          </>
        ),
      }
    case 'reactivate':
      return {
        title: 'Reactivate user',
        confirmLabel: 'Reactivate',
        message: (
          <>
            <strong>{c.user.name}</strong> can sign in again with their existing password, with the {c.user.role}{' '}
            role’s access.
          </>
        ),
      }
    case 'unlock':
      return {
        title: 'Unlock user',
        confirmLabel: 'Unlock',
        message: (
          <>
            <strong>{c.user.name}</strong> was locked after 5 wrong passwords. Unlock now so they can try again before
            the 15 minutes are up?
          </>
        ),
      }
    case 'unlink':
      return {
        title: 'Unlink employee record',
        confirmLabel: 'Unlink',
        message: (
          <>
            Remove the link between <strong>{c.user.name}</strong>’s login and their employee record? The login and
            the record both stay.
          </>
        ),
      }
    case 'link':
      return {
        title: 'Link to employee record',
        confirmLabel: 'Link',
        message: (
          <>
            Link the login <strong>{c.suggestion.userName}</strong> to the employee record{' '}
            <strong>{c.suggestion.employeeName}</strong> (NIC {c.suggestion.nic})? Check it is the same person.
          </>
        ),
      }
  }
}

/** A labelled row action; when not allowed it stays focusable and says why (aria-disabled + tooltip). */
function ActionButton({
  icon,
  label,
  reason,
  onClick,
}: {
  icon: ReactNode
  label: string
  reason: string | null
  onClick: () => void
}) {
  if (!reason) {
    return (
      <Button size="sm" variant="ghost" onClick={onClick}>
        {icon}
        {label}
      </Button>
    )
  }
  return (
    <Tooltip content={reason}>
      {(p) => (
        <Button
          size="sm"
          variant="ghost"
          aria-disabled="true"
          {...p}
          onClick={(e) => e.preventDefault()}
          className="cursor-not-allowed text-text-disabled hover:bg-transparent hover:text-text-disabled"
        >
          {icon}
          {label}
        </Button>
      )}
    </Tooltip>
  )
}
