import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as employeesService from '@/services/employees'
import type { Employee } from './types'
import { employeeSchema, type EmployeeForm, BANKS, BRANCHES, DEPARTMENTS, ROLES } from './schema'

/* EMP-04 — same fields/validation as EMP-02 but a single scrollable form. */
export function EmployeeEditPage() {
  const { id } = useParams()

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

  return (
    <div>
      <PageHeader
        title={`Edit ${employee.name}`}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Employees', to: '/employees' },
          { label: employee.name, to: `/employees/${employee.id}` },
          { label: 'Edit' },
        ]}
      />
      <EditForm employee={employee} />
    </div>
  )
}

/* Split out so its form state can lazily init straight from `employee` — the
   parent only mounts this once `employee` is guaranteed loaded, so there's no
   "sync state from a prop" effect needed at all. */
function EditForm({ employee }: { employee: Employee }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee.name,
      nic: employee.nic,
      dob: employee.dob,
      contact: employee.contact,
      address: employee.address,
      role: employee.role,
      department: employee.department,
      hireDate: employee.hireDate,
      employmentType: employee.employmentType,
      bank: employee.bank.bank,
      branch: employee.bank.branch,
      account: employee.bank.account,
      hasLogin: employee.hasLogin,
      dayRate: employee.rates?.day ?? 0,
      dayOtRate: employee.rates?.dayOt ?? 0,
      nightRate: employee.rates?.night ?? 0,
      nightOtRate: employee.rates?.nightOt ?? 0,
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: EmployeeForm) => employeesService.update(employee.id, data),
    onSuccess: () => {
      toast('Employee updated')
      void queryClient.invalidateQueries({ queryKey: ['employee', employee.id] })
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate(`/employees/${employee.id}`)
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not update this employee', 'danger'),
  })

  const onSubmit = (data: EmployeeForm) => {
    updateMutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>Personal</CardTitle></CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" error={errors.name?.message} {...register('name')} />
          <Input label="NIC number" error={errors.nic?.message} {...register('nic')} />
          <Input label="Date of birth" type="date" error={errors.dob?.message} {...register('dob')} />
          <Input label="Contact number" error={errors.contact?.message} {...register('contact')} />
          <div className="sm:col-span-2"><Input label="Address" error={errors.address?.message} {...register('address')} /></div>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Employment</CardTitle></CardHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Role" error={errors.role?.message} options={ROLES.map((r) => ({ value: r, label: r }))} {...register('role')} />
            <Select label="Department" error={errors.department?.message} options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} {...register('department')} />
            <Input label="Hire date" type="date" error={errors.hireDate?.message} {...register('hireDate')} />
            <Select label="Employment type" options={['Permanent', 'Contract', 'Casual'].map((t) => ({ value: t, label: t }))} {...register('employmentType')} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text">Pay rates (Rs. / hour)</p>
            <div className="grid gap-4 sm:grid-cols-4">
              <Input label="Day" type="number" step="0.01" error={errors.dayRate?.message} {...register('dayRate', { valueAsNumber: true })} />
              <Input label="Day OT" type="number" step="0.01" error={errors.dayOtRate?.message} {...register('dayOtRate', { valueAsNumber: true })} />
              <Input label="Night" type="number" step="0.01" error={errors.nightRate?.message} {...register('nightRate', { valueAsNumber: true })} />
              <Input label="Night OT" type="number" step="0.01" error={errors.nightOtRate?.message} {...register('nightOtRate', { valueAsNumber: true })} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Bank" error={errors.bank?.message} options={BANKS.map((b) => ({ value: b, label: b }))} {...register('bank')} />
          <Select label="Branch" error={errors.branch?.message} options={BRANCHES.map((b) => ({ value: b, label: b }))} {...register('branch')} />
          <Input label="Account number" error={errors.account?.message} {...register('account')} />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate(`/employees/${employee.id}`)} disabled={updateMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={updateMutation.isPending}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}
