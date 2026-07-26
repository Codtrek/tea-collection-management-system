import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { MultiStepWizard } from '@/components/patterns/MultiStepWizard'
import { useToast } from '@/components/ui/Toast'
import * as employeesService from '@/services/employees'
import { employeeSchema, type EmployeeForm, BANKS, BRANCHES, DEPARTMENTS, ROLES } from './schema'
import { formatDate } from '@/lib/format'

const STEPS = [
  { id: 'personal', label: 'Personal Information', fields: ['name', 'nic', 'dob', 'contact', 'address'] },
  {
    id: 'employment',
    label: 'Employment Details',
    fields: ['role', 'department', 'hireDate', 'employmentType', 'dayRate', 'dayOtRate', 'nightRate', 'nightOtRate'],
  },
  { id: 'bank', label: 'Bank Details', fields: ['bank', 'branch', 'account'] },
  { id: 'documents', label: 'Documents', fields: [] },
  { id: 'permissions', label: 'Permissions / Role', fields: [] },
  { id: 'review', label: 'Review', fields: [] },
] as const

export function EmployeeRegistrationPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)

  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    formState: { errors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    mode: 'onBlur',
    defaultValues: {
      employmentType: 'Permanent',
      hasLogin: false,
      dayRate: 0,
      dayOtRate: 0,
      nightRate: 0,
      nightOtRate: 0,
    },
  })

  // useWatch is the memoization-safe reactive read (works with React Compiler).
  const values = useWatch({ control })

  const next = async () => {
    const fields = STEPS[step].fields as readonly (keyof EmployeeForm)[]
    const ok = fields.length === 0 || (await trigger(fields))
    if (ok) setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  const createMutation = useMutation({
    mutationFn: (data: EmployeeForm) => employeesService.create(data),
    onSuccess: (employee) => {
      toast('Employee registered')
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate(`/employees/${employee.id}`)
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not register this employee', 'danger'),
  })

  const onSubmit = (data: EmployeeForm) => {
    createMutation.mutate(data)
  }

  return (
    <div>
      <PageHeader
        title="Register Employee"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Employees', to: '/employees' }, { label: 'Register' }]}
      />

      <MultiStepWizard steps={STEPS.map((s) => ({ id: s.id, label: s.label }))} current={step} onStepClick={setStep}>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full name" error={errors.name?.message} {...register('name')} />
                <Input label="NIC number" error={errors.nic?.message} {...register('nic')} />
                <Input label="Date of birth" type="date" error={errors.dob?.message} {...register('dob')} />
                <Input label="Contact number" error={errors.contact?.message} {...register('contact')} />
                <div className="sm:col-span-2">
                  <Input label="Address" error={errors.address?.message} {...register('address')} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Role / position" placeholder="Select role" error={errors.role?.message} options={ROLES.map((r) => ({ value: r, label: r }))} {...register('role')} />
                  <Select label="Department" placeholder="Select department" error={errors.department?.message} options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} {...register('department')} />
                  <Input label="Hire date" type="date" error={errors.hireDate?.message} {...register('hireDate')} />
                  <Select label="Employment type" options={['Permanent', 'Contract', 'Casual'].map((t) => ({ value: t, label: t }))} {...register('employmentType')} />
                </div>

                {/* Feeds payroll generation (shift-based Day/Day-OT/Night/Night-OT pay). */}
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
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Bank" placeholder="Select bank" error={errors.bank?.message} options={BANKS.map((b) => ({ value: b, label: b }))} {...register('bank')} />
                <Select label="Branch" placeholder="Select branch" error={errors.branch?.message} options={BRANCHES.map((b) => ({ value: b, label: b }))} {...register('branch')} />
                <Input label="Account number" hint="Masked on the profile; revealed on click." error={errors.account?.message} {...register('account')} />
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {['NIC copy', 'Photo'].map((doc) => (
                  <label key={doc} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-sunken px-4 py-8 text-center hover:bg-surface-hover">
                    <Upload className="size-6 text-text-muted" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-text">{doc}</span>
                    <span className="text-xs text-text-muted">Click to upload (demo)</span>
                    <input type="file" className="hidden" />
                  </label>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-text">System login access</p>
                    <p className="text-xs text-text-muted">Non-workflow roles (operators, drivers) are HR records only and don't get login (§3.2.2).</p>
                  </div>
                  <Toggle checked={values.hasLogin ?? false} onChange={(v) => setValue('hasLogin', v)} />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-4">
                <ReviewGroup title="Personal" rows={[['Full name', values.name], ['NIC', values.nic], ['Date of birth', values.dob && formatDate(values.dob)], ['Contact', values.contact], ['Address', values.address]]} />
                <ReviewGroup
                  title="Employment"
                  rows={[
                    ['Role', values.role],
                    ['Department', values.department],
                    ['Hire date', values.hireDate && formatDate(values.hireDate)],
                    ['Type', values.employmentType],
                    ['Pay rates', `Day Rs. ${values.dayRate ?? 0} · Day OT Rs. ${values.dayOtRate ?? 0} · Night Rs. ${values.nightRate ?? 0} · Night OT Rs. ${values.nightOtRate ?? 0}`],
                  ]}
                />
                <ReviewGroup title="Bank" rows={[['Bank', values.bank], ['Branch', values.branch], ['Account', values.account]]} />
                <ReviewGroup title="Permissions" rows={[['System login', values.hasLogin ? 'Enabled' : 'Disabled']]} />
              </div>
            )}

            <div className="flex justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || createMutation.isPending}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" loading={createMutation.isPending}>
                  Register Employee
                </Button>
              )}
            </div>
          </form>
        </Card>
      </MultiStepWizard>
    </div>
  )
}

function ReviewGroup({ title, rows }: { title: string; rows: Array<[string, string | undefined]> }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-sm">
            <dt className="text-text-muted">{k}</dt>
            <dd className="text-text">{v || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
