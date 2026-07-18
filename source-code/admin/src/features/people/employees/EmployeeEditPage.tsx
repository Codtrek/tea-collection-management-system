import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { employeeSchema, type EmployeeForm, BANKS, BRANCHES, DEPARTMENTS, ROLES } from './schema'
import { EMPLOYEES } from './data'

/* EMP-04 — same fields/validation as EMP-02 but a single scrollable form. */
export function EmployeeEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const emp = EMPLOYEES.find((e) => e.id === id) ?? EMPLOYEES[0]

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: emp.name,
      nic: emp.nic,
      dob: emp.dob,
      contact: emp.contact,
      address: emp.address,
      role: emp.role,
      department: emp.department,
      hireDate: emp.hireDate,
      employmentType: emp.employmentType,
      bank: emp.bank.bank,
      branch: emp.bank.branch,
      account: emp.bank.account,
      hasLogin: emp.hasLogin,
    },
  })

  const onSubmit = (data: EmployeeForm) => {
    void data
    toast('Employee updated')
    navigate(`/employees/${emp.id}`)
  }

  return (
    <div>
      <PageHeader title={`Edit ${emp.name}`} breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Employees', to: '/employees' }, { label: emp.name, to: `/employees/${emp.id}` }, { label: 'Edit' }]} />

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
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Role" error={errors.role?.message} options={ROLES.map((r) => ({ value: r, label: r }))} {...register('role')} />
            <Select label="Department" error={errors.department?.message} options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} {...register('department')} />
            <Input label="Hire date" type="date" error={errors.hireDate?.message} {...register('hireDate')} />
            <Select label="Employment type" options={['Permanent', 'Contract', 'Casual'].map((t) => ({ value: t, label: t }))} {...register('employmentType')} />
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
          <Button type="button" variant="secondary" onClick={() => navigate(`/employees/${emp.id}`)}>Cancel</Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
