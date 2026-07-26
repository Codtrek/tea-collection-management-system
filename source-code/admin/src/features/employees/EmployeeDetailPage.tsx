import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, UserX, CalendarPlus, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DetailPageWithTabs } from '@/components/patterns/DetailPageWithTabs'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as employeesService from '@/services/employees'
import { netPay } from './calc'
import type { AttendanceRecord, PayrollRow } from './types'
import { formatCurrency, formatDate, initials, maskAccount } from '@/lib/format'

const statusTone: Record<string, BadgeTone> = { Active: 'success', Suspended: 'warning', Inactive: 'danger' }
const attendanceTone: Record<string, BadgeTone> = { Present: 'success', Absent: 'danger', Leave: 'warning', 'Half-day': 'submitted' }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  )
}

/* EMP-03 — DetailPageWithTabs: Overview | Employment | Bank | Attendance History | Salary History | Documents. */
export function EmployeeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can, level } = useAuth()
  const queryClient = useQueryClient()
  const [deactivating, setDeactivating] = useState(false)

  // Administrator sees bank unmasked; Officer/Manager see it masked (§13 field-level sensitivity).
  const unmask = level('employees') === 'approve'
  const canManage = can('employees', 'approve')

  const {
    data: employee,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesService.getById(id!),
    enabled: !!id,
  })
  // Attendance/payroll have no "for this employee" endpoint yet — fetch the
  // (dev-scale) full lists and filter client-side, same as Estates' pattern.
  const { data: allAttendance } = useQuery({ queryKey: ['employees', 'attendance'], queryFn: () => employeesService.listAttendance() })
  const { data: allPayroll } = useQuery({ queryKey: ['employees', 'payroll'], queryFn: () => employeesService.listPayroll() })

  const deactivateMutation = useMutation({
    mutationFn: (employeeId: string) => employeesService.deactivate(employeeId),
    onSuccess: (updated) => {
      toast(`${updated.name} deactivated`, 'warning')
      setDeactivating(false)
      void queryClient.invalidateQueries({ queryKey: ['employee', id] })
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/employees')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not deactivate this employee', 'danger'),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !employee) {
    return <ErrorState title="Employee not found" description={`No employee with ID “${id}”.`} onRetry={() => void refetch()} />
  }

  const attendance = (allAttendance ?? []).filter((a) => a.employeeId === employee.id)
  const payroll = (allPayroll ?? []).filter((p) => p.employeeId === employee.id)

  const attendanceColumns: Column<AttendanceRecord>[] = [
    { key: 'date', header: 'Date', render: (a) => formatDate(a.date) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge tone={attendanceTone[a.status]}>{a.status}</StatusBadge> },
    { key: 'dayHours', header: 'Day', align: 'right', render: (a) => a.dayHours },
    { key: 'dayOtHours', header: 'Day OT', align: 'right', render: (a) => a.dayOtHours },
    { key: 'nightHours', header: 'Night', align: 'right', render: (a) => a.nightHours },
    { key: 'nightOtHours', header: 'Night OT', align: 'right', render: (a) => a.nightOtHours },
  ]

  const payrollColumns: Column<PayrollRow>[] = [
    { key: 'period', header: 'Period' },
    { key: 'gross', header: 'Gross', align: 'right', render: (p) => formatCurrency(p.gross) },
    { key: 'net', header: 'Net Pay', align: 'right', render: (p) => formatCurrency(netPay(p)) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge tone={p.status === 'Processed' ? 'success' : 'warning'}>{p.status}</StatusBadge> },
  ]

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-xl font-semibold text-primary">
          {initials(employee.name)}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-text-heading">{employee.name}</h2>
          <p className="id text-[13px] text-text-muted">{employee.id} · {employee.role}</p>
          <div className="mt-1.5 flex gap-2">
            <StatusBadge tone={statusTone[employee.status]}>{employee.status}</StatusBadge>
            <StatusBadge tone="submitted">{employee.department}</StatusBadge>
          </div>
        </div>
      </div>
      {canManage && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/employees/${employee.id}/edit`)}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/employees/attendance/entry')}>
            <CalendarPlus className="size-4" /> Record Attendance
          </Button>
          {employee.status === 'Active' && (
            <Button variant="danger" size="sm" onClick={() => setDeactivating(true)}>
              <UserX className="size-4" /> Deactivate
            </Button>
          )}
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
            <Field label="NIC" value={employee.nic} />
            <Field label="Date of birth" value={formatDate(employee.dob)} />
            <Field label="Contact" value={employee.contact} />
            <Field label="Address" value={employee.address} />
            <Field label="Employment type" value={employee.employmentType} />
            <Field label="System login" value={employee.hasLogin ? 'Enabled' : 'HR record only'} />
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
            <Field label="Role" value={employee.role} />
            <Field label="Department" value={employee.department} />
            <Field label="Hire date" value={formatDate(employee.hireDate)} />
            {employee.rates && (
              <Field
                label="Pay rates (Rs./hr)"
                value={`Day ${employee.rates.day} · Day OT ${employee.rates.dayOt} · Night ${employee.rates.night} · Night OT ${employee.rates.nightOt}`}
              />
            )}
          </dl>
          {employee.lastUpdatedBy && (
            <p className="mt-6 border-t border-border pt-4 text-xs text-text-muted">
              Last updated by {employee.lastUpdatedBy} on {employee.lastUpdatedOn && formatDate(employee.lastUpdatedOn)}
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
          {employee.bank.account ? (
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Bank" value={employee.bank.bank} />
              <Field label="Branch" value={employee.bank.branch} />
              <Field label="Account" value={<span className="id">{unmask ? employee.bank.account : maskAccount(employee.bank.account)}</span>} />
            </dl>
          ) : (
            <p className="text-sm text-danger-fg">No bank details on file — this employee is excluded from payroll runs.</p>
          )}
        </div>
      ),
    },
    {
      id: 'attendance',
      label: 'Attendance History',
      content: (
        <DataTable
          columns={attendanceColumns}
          rows={attendance}
          rowKey={(a) => a.date}
          emptyState={<EmptyState title="No attendance yet" description="Attendance records appear here once marked." />}
        />
      ),
    },
    {
      id: 'salary',
      label: 'Salary History',
      content: (
        <DataTable
          columns={payrollColumns}
          rows={payroll}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/employees/payroll/${p.id}/payslip`)}
          emptyState={<EmptyState title="No payslips yet" description="Processed payroll appears here." />}
        />
      ),
    },
    { id: 'documents', label: 'Documents', content: <EmptyState title="No documents uploaded" description="NIC copy and photo appear here." /> },
  ]

  return (
    <div>
      <PageHeader title={employee.name} breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Employees', to: '/employees' }, { label: employee.name }]} />
      <DetailPageWithTabs header={header} tabs={tabs} />

      <LightConfirmModal
        open={deactivating}
        onClose={() => setDeactivating(false)}
        onConfirm={() => deactivateMutation.mutate(employee.id)}
        loading={deactivateMutation.isPending}
        tone="danger"
        title="Deactivate employee"
        confirmLabel="Deactivate"
        message={<>Deactivating <strong>{employee.name}</strong> revokes system access and removes them from active rosters. Historical records remain intact.</>}
      >
        <Select label="Reason" placeholder="Select a reason" options={[{ value: 'resigned', label: 'Resigned' }, { value: 'terminated', label: 'Terminated' }, { value: 'other', label: 'Other' }]} />
      </LightConfirmModal>
    </div>
  )
}
