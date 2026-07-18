import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, UserX, CalendarPlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DetailPageWithTabs } from '@/components/patterns/DetailPageWithTabs'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/data/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { EMPLOYEES } from './data'
import type { EmployeeStatus } from './types'
import { formatDate, initials, maskAccount } from '@/lib/format'

const statusTone: Record<EmployeeStatus, BadgeTone> = { Active: 'success', Suspended: 'warning', Inactive: 'danger' }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  )
}

export function EmployeeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can, level } = useAuth()
  const emp = EMPLOYEES.find((e) => e.id === id) ?? EMPLOYEES[0]
  const [deactivating, setDeactivating] = useState(false)

  // Officer sees bank masked; Administrator unmasked (§13 field-level sensitivity).
  const unmask = level('employees') === 'approve'
  const canManage = can('employees', 'edit')

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-xl font-semibold text-primary">
          {initials(emp.name)}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-text-heading">{emp.name}</h2>
          <p className="id text-[13px] text-text-muted">{emp.id} · {emp.role}</p>
          <div className="mt-1.5 flex gap-2">
            <StatusBadge tone={statusTone[emp.status]}>{emp.status}</StatusBadge>
            <StatusBadge tone="submitted">{emp.department}</StatusBadge>
          </div>
        </div>
      </div>
      {canManage && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/employees/${emp.id}/edit`)}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/employees/attendance/entry')}>
            <CalendarPlus className="size-4" /> Record Attendance
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeactivating(true)}>
            <UserX className="size-4" /> Deactivate
          </Button>
        </div>
      )}
    </div>
  )

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-1)]">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="NIC" value={emp.nic} />
            <Field label="Date of birth" value={formatDate(emp.dob)} />
            <Field label="Contact" value={emp.contact} />
            <Field label="Address" value={emp.address} />
            <Field label="Employment type" value={emp.employmentType} />
            <Field label="System login" value={emp.hasLogin ? 'Enabled' : 'HR record only'} />
          </dl>
        </div>
      ),
    },
    {
      id: 'employment',
      label: 'Employment',
      content: (
        <div className="rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-1)]">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Role" value={emp.role} />
            <Field label="Department" value={emp.department} />
            <Field label="Hire date" value={formatDate(emp.hireDate)} />
          </dl>
          {emp.lastUpdatedBy && (
            <p className="mt-6 border-t border-border pt-4 text-xs text-text-muted">
              Last updated by {emp.lastUpdatedBy} on {emp.lastUpdatedOn && formatDate(emp.lastUpdatedOn)}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'bank',
      label: 'Bank Details',
      content: (
        <div className="rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-1)]">
          {emp.bank.account ? (
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Bank" value={emp.bank.bank} />
              <Field label="Branch" value={emp.bank.branch} />
              <Field label="Account" value={<span className="id">{unmask ? emp.bank.account : maskAccount(emp.bank.account)}</span>} />
            </dl>
          ) : (
            <p className="text-sm text-danger-fg">No bank details on file — this employee is excluded from payroll runs.</p>
          )}
        </div>
      ),
    },
    { id: 'attendance', label: 'Attendance History', content: <EmptyState title="No attendance yet" description="Attendance records appear here once marked." /> },
    { id: 'salary', label: 'Salary History', content: <EmptyState title="No payslips yet" description="Processed payroll appears here." /> },
    { id: 'documents', label: 'Documents', content: <EmptyState title="No documents uploaded" description="NIC copy and photo appear here." /> },
  ]

  return (
    <div>
      <PageHeader title={emp.name} breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Employees', to: '/employees' }, { label: emp.name }]} />
      <DetailPageWithTabs header={header} tabs={tabs} />

      <LightConfirmModal
        open={deactivating}
        onClose={() => setDeactivating(false)}
        onConfirm={() => {
          toast(`${emp.name} deactivated`, 'warning')
          setDeactivating(false)
          navigate('/employees')
        }}
        tone="danger"
        title="Deactivate employee"
        confirmLabel="Deactivate"
        message={<>Deactivating <strong>{emp.name}</strong> revokes system access and removes them from active rosters. Historical records remain intact.</>}
      >
        <Select label="Reason" placeholder="Select a reason" options={[{ value: 'resigned', label: 'Resigned' }, { value: 'terminated', label: 'Terminated' }, { value: 'other', label: 'Other' }]} />
      </LightConfirmModal>
    </div>
  )
}
