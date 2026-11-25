import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, KeyRound } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import * as adminService from '@/services/admin'
import type { Role } from '@/types'
import type { IssuedPassword, SystemUser } from './types'

const PHONE = /^(?:\+94|0)\d{9}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* ── Temporary password: shown once ─────────────────────────────────── */

/**
 * The one place a temporary password is ever shown. It lives only in this component's props —
 * never in the query cache — and is gone when the dialog closes.
 */
export function TemporaryPasswordModal({
  issued,
  onClose,
  title,
}: {
  issued: IssuedPassword | null
  onClose: () => void
  title: string
}) {
  const [copied, setCopied] = useState(false)
  const close = () => {
    setCopied(false)
    onClose()
  }
  return (
    <Modal
      open={!!issued}
      onClose={close}
      title={title}
      footer={<Button onClick={close}>Done, I’ve noted it</Button>}
    >
      {issued && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text">
            Give this temporary password to <strong>{issued.user.name}</strong> in person. They must choose their own
            password the first time they sign in.
          </p>
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-sunken px-3 py-2">
            <KeyRound className="size-4 shrink-0 text-text-muted" aria-hidden />
            <code className="flex-1 select-all font-mono text-base tracking-wide text-text-heading" data-testid="temp-password">
              {issued.temporaryPassword}
            </code>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(issued.temporaryPassword).then(() => setCopied(true))
              }}
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            It won’t be shown again. If it’s lost, use Reset password to issue a new one. Sign-in: {issued.user.phone}
          </p>
        </div>
      )}
    </Modal>
  )
}

/* ── Add user (always from an HR employee) ─────────────────────────── */

export function AddUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (issued: IssuedPassword) => void
}) {
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [phone, setPhone] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const eligible = useQuery({
    queryKey: ['admin', 'users', 'eligible'],
    queryFn: adminService.getEligibleEmployees,
    enabled: open,
  })
  const employees = eligible.data?.employees ?? []
  const roles = eligible.data?.assignableRoles ?? []
  const employee = employees.find((e) => String(e.id) === employeeId)
  const phoneValue = phone ?? employee?.contact ?? ''

  const reset = () => {
    setEmployeeId('')
    setRole('')
    setPhone(null)
    setEmail('')
    setErrors({})
  }

  // gcTime 0: the response (which carries the password) is dropped as soon as it's handed over
  const create = useMutation({
    gcTime: 0,
    mutationFn: () =>
      adminService.createSystemUser({
        employeeId: Number(employeeId),
        role: role as Role,
        phone: phoneValue.trim(),
        email: email.trim() || undefined,
      }),
    onSuccess: (issued) => {
      reset()
      onCreated(issued)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not add the user', 'danger'),
  })

  const submit = () => {
    const e: Record<string, string> = {}
    if (!employee) e.employee = 'Choose the employee this login is for.'
    if (!role) e.role = 'Choose a role.'
    if (!PHONE.test(phoneValue.trim())) e.phone = 'Enter a valid phone number (07XXXXXXXX).'
    if (email.trim() && !EMAIL.test(email.trim())) e.email = 'Enter a valid email address.'
    setErrors(e)
    if (Object.keys(e).length === 0) create.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Add user"
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending}>
            Add user
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          A portal login is always for someone on the HR roster. Their name and NIC come from their employee record.
        </p>
        <Combobox
          label="Employee"
          placeholder={eligible.isPending ? 'Loading employees…' : 'Search name or NIC…'}
          noun="employees"
          items={employees}
          value={employeeId}
          onChange={(k) => {
            setEmployeeId(k)
            setPhone(null)
          }}
          getKey={(e) => String(e.id)}
          getLabel={(e) => e.name}
          getMeta={(e) => `${e.jobTitle} · NIC ${e.nic}`}
          getSearchText={(e) => `${e.name} ${e.nic}`}
          error={errors.employee}
        />
        <p className="-mt-2 text-xs text-text-muted">
          Only active employees without a login are listed. Collection agents get their mobile login from Employees.{' '}
          <Link to="/employees/new" className="font-medium text-primary hover:underline">
            Employee not listed? Add employee
          </Link>
        </p>
        <Select
          label="Role"
          placeholder="Choose a role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          options={roles.map((r) => ({ value: r, label: r }))}
          error={errors.role}
        />
        <Input
          label="Phone (sign-in)"
          type="tel"
          value={phoneValue}
          onChange={(e) => setPhone(e.target.value)}
          hint="Taken from the employee record; change it here if they sign in with another number."
          error={errors.phone}
        />
        <Input
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <p className="text-xs text-text-muted">
          A temporary password is created and shown once, after you add the user.
        </p>
      </div>
    </Modal>
  )
}

/* ── Edit user ──────────────────────────────────────────────────────── */

export function EditUserModal({
  user,
  onClose,
  onSaved,
  onUnlink,
}: {
  user: SystemUser | null
  onClose: () => void
  onSaved: (u: SystemUser) => void
  onUnlink: (u: SystemUser) => void
}) {
  // keyed by the user id, so each open starts from that user's values
  return user ? <EditUserForm key={user.id} user={user} onClose={onClose} onSaved={onSaved} onUnlink={onUnlink} /> : null
}

function EditUserForm({
  user,
  onClose,
  onSaved,
  onUnlink,
}: {
  user: SystemUser
  onClose: () => void
  onSaved: (u: SystemUser) => void
  onUnlink: (u: SystemUser) => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone)
  const [email, setEmail] = useState(user.email ?? '')
  const [role, setRole] = useState<Role>(user.role)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const eligible = useQuery({ queryKey: ['admin', 'users', 'eligible'], queryFn: adminService.getEligibleEmployees })
  const roles = eligible.data?.assignableRoles ?? [user.role]
  const roleChanged = role !== user.role

  const save = useMutation({
    mutationFn: () =>
      adminService.updateSystemUser(user.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        ...(roleChanged ? { role, reason: reason.trim() || undefined } : {}),
      }),
    onSuccess: onSaved,
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not save the user', 'danger'),
  })

  const submit = () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = 'Enter the name.'
    if (!PHONE.test(phone.trim())) e.phone = 'Enter a valid phone number (07XXXXXXXX).'
    if (email.trim() && !EMAIL.test(email.trim())) e.email = 'Enter a valid email address.'
    setErrors(e)
    if (Object.keys(e).length === 0) save.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${user.name}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Input label="Phone (sign-in)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <div>
          <Select
            label="Role"
            value={role}
            disabled={!!user.actions.changeRole}
            onChange={(e) => setRole(e.target.value as Role)}
            options={(roles.includes(user.role) ? roles : [user.role, ...roles]).map((r) => ({ value: r, label: r }))}
          />
          {user.actions.changeRole && <p className="mt-1.5 text-xs text-text-muted">{user.actions.changeRole}</p>}
        </div>
        {roleChanged && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-reason" className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Reason (optional)
            </label>
            <textarea
              id="role-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            />
            <p className="text-xs text-text-muted">
              {user.name} is signed out and gets the {role} role’s access on their next sign-in. Recorded in the audit
              log.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm">
          <span className="text-text-muted">
            Employee record:{' '}
            {user.linkedEmployee ? (
              <Link to={`/employees/${user.linkedEmployee.id}`} className="font-medium text-primary hover:underline">
                {user.linkedEmployee.name}
              </Link>
            ) : (
              <span className="text-text">Not linked</span>
            )}
          </span>
          {user.linkedEmployee && !user.actions.edit && (
            <Button size="sm" variant="ghost" onClick={() => onUnlink(user)}>
              Unlink
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
