import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Info, Loader2, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MultiStepWizard } from '@/components/patterns/MultiStepWizard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Combobox } from '@/components/ui/Combobox'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/data/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import { addDays } from '@/features/admin/factory-setup-model'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate } from '@/lib/format'
import { periodOf } from '@/lib/month'
import * as employeesService from '@/services/employees'
import type { PayChangeInput } from './types'

/*
  Pay change (Administration-Addendum §8) — the Manager prepares it (`payRates: edit`): who, the
  change (% or Rs per hour on all 4 hourly rates, optional rounding), from when, a preview per
  employee with the monthly cost change, then a reason. It applies only after an Administrator
  approves it. `?employee=EMP-0002` opens it for one person (the employee page's "Change pay").
*/

const STEPS = [
  { id: 'who', label: 'Who' },
  { id: 'change', label: 'Change' },
  { id: 'preview', label: 'Preview & submit' },
]

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatCurrency(Math.abs(n))}`

export function PayChangePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const preset = params.get('employee')
  const today = factoryToday()
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<PayChangeInput>({
    scope: preset ? 'employees' : 'all',
    employeeIds: preset ? [preset] : [],
    direction: 'increase',
    kind: 'percent',
    amount: 0,
    rounding: 0,
    effectiveDate: addDays(today, 1),
  })
  const [amountText, setAmountText] = useState('')
  const [reason, setReason] = useState('')
  const [agreed, setAgreed] = useState(false)
  const set = (patch: Partial<PayChangeInput>) => setInput((prev) => ({ ...prev, ...patch }))

  const employees = useQuery({ queryKey: ['employees'], queryFn: employeesService.list })
  const roles = useQuery({ queryKey: ['employees', 'pay-rates'], queryFn: employeesService.getPayRates })
  const preview = useQuery({
    queryKey: ['employees', 'pay-preview', input],
    queryFn: () => employeesService.previewPayChange(input),
    enabled: step === 2,
  })
  const prepare = useMutation({
    mutationFn: () => employeesService.preparePayChange({ ...input, reason: reason.trim(), decreaseAgreement: agreed }),
    onSuccess: (adj) => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast(`Pay change #${adj.id} sent for approval, and recorded in the audit log`)
      navigate('/employees/pay-rates')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not prepare the pay change', 'danger'),
  })

  if (!can('payRates', 'edit')) {
    return <EmptyState title="Your role can’t prepare pay changes" description="The Factory Manager prepares pay changes; an Administrator approves them." />
  }

  const active = (employees.data ?? []).filter((e) => e.status === 'Active')
  const picked = active.filter((e) => input.employeeIds?.includes(e.id))
  const whoReady = input.scope === 'all' || (input.scope === 'role' ? !!input.role : picked.length > 0)
  const changeReady = input.amount > 0 && input.effectiveDate >= today
  const p = preview.data
  const blocked = (p?.blockers ?? []).filter((b) => !b.startsWith('Reducing'))
  const canSubmit = !!p && blocked.length === 0 && reason.trim().length >= 3 && (!p.isDecrease || agreed)

  return (
    <div>
      <PageHeader
        title="Change pay"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Pay Rates', to: '/employees/pay-rates' }, { label: 'Change pay' }]}
        description="Prepare a pay change. It applies only once an Administrator approves it, and never changes payroll already processed."
      />
      <Card>
        <MultiStepWizard steps={STEPS} current={step} onStepClick={setStep}>
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div role="radiogroup" aria-label="Who" className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ['all', 'All employees', 'Every active employee'],
                    ['role', 'A role', 'Everyone in one role'],
                    ['employees', 'Selected employees', 'Pick one or more people'],
                  ] as const
                ).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={input.scope === value}
                    onClick={() => set({ scope: value })}
                    className={cn(
                      'rounded-[var(--radius-md)] border px-4 py-3 text-left text-sm',
                      input.scope === value ? 'border-primary bg-brand-soft text-primary' : 'border-border text-text hover:bg-surface-hover',
                    )}
                  >
                    <span className="block font-medium">{label}</span>
                    <span className="block text-xs text-text-muted">{hint}</span>
                  </button>
                ))}
              </div>
              {input.scope === 'role' && (
                <Select
                  label="Role"
                  placeholder="Pick a role"
                  value={input.role ?? ''}
                  onChange={(e) => set({ role: e.target.value || undefined })}
                  options={(roles.data ?? []).map((r) => ({ value: r.role, label: `${r.role} (${r.employees.filter((x) => x.status === 'Active').length})` }))}
                />
              )}
              {input.scope === 'employees' && (
                <div className="flex flex-col gap-2">
                  <Combobox
                    label="Add an employee"
                    placeholder="Type a name or EMP id"
                    noun="employees"
                    items={active}
                    value=""
                    onChange={(id) => id && !input.employeeIds?.includes(id) && set({ employeeIds: [...(input.employeeIds ?? []), id] })}
                    getKey={(e) => e.id}
                    getLabel={(e) => e.name}
                    getMeta={(e) => `${e.id} · ${e.role}`}
                    getDisabledReason={(e) => (input.employeeIds?.includes(e.id) ? 'Already added' : null)}
                    disabledBadge="Added"
                  />
                  <ul className="flex flex-wrap gap-2" aria-label="Selected employees">
                    {picked.map((e) => (
                      <li key={e.id} className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm text-primary">
                        {e.name}
                        <button
                          type="button"
                          aria-label={`Remove ${e.name}`}
                          onClick={() => set({ employeeIds: input.employeeIds?.filter((x) => x !== e.id) })}
                          className="rounded-full p-0.5 hover:bg-surface-hover"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end">
                <Button disabled={!whoReady} onClick={() => setStep(1)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Increase or decrease"
                  value={input.direction}
                  onChange={(e) => set({ direction: e.target.value as PayChangeInput['direction'] })}
                  options={[
                    { value: 'increase', label: 'Increase' },
                    { value: 'decrease', label: 'Decrease' },
                  ]}
                />
                <Select
                  label="By"
                  value={input.kind}
                  onChange={(e) => set({ kind: e.target.value as PayChangeInput['kind'] })}
                  options={[
                    { value: 'percent', label: 'A percentage' },
                    { value: 'amount', label: 'A fixed amount (Rs per hour)' },
                  ]}
                />
                <Input
                  label={input.kind === 'percent' ? 'Percentage (%)' : 'Amount (Rs per hour)'}
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountText}
                  onChange={(e) => {
                    setAmountText(e.target.value)
                    set({ amount: Number(e.target.value) || 0 })
                  }}
                  hint="Applied to all four hourly rates: day, day OT, night, night OT."
                />
                <Select
                  label="Round each rate"
                  value={String(input.rounding)}
                  onChange={(e) => set({ rounding: Number(e.target.value) as PayChangeInput['rounding'] })}
                  options={[
                    { value: '0', label: 'No rounding' },
                    { value: '10', label: 'To the nearest Rs. 10' },
                    { value: '50', label: 'To the nearest Rs. 50' },
                  ]}
                />
                <Input
                  label="Effective from"
                  type="date"
                  min={today}
                  value={input.effectiveDate}
                  onChange={(e) => set({ effectiveDate: e.target.value })}
                  error={input.effectiveDate < today ? 'A pay change starts today or later.' : undefined}
                  hint="Never inside a month whose payroll is already processed."
                />
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button disabled={!changeReady} onClick={() => setStep(2)}>
                  Preview
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              {preview.isPending ? (
                <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
              ) : preview.isError || !p ? (
                <p className="text-sm text-danger-fg">{preview.error instanceof ApiError ? preview.error.message : 'Could not preview the change.'}</p>
              ) : (
                <>
                  {p.minimumNotSet.length > 0 && (
                    <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      No minimum set ({p.minimumNotSet.join(' and ')}) — not checked. Enter the statutory minimum daily pay in System
                      Settings → Payroll rules.
                    </p>
                  )}
                  {blocked.map((b) => (
                    <p key={b} className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger-fg/25 bg-danger-bg px-3 py-2 text-sm text-danger-fg">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {b}
                    </p>
                  ))}
                  <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-sunken">
                        <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                          <th className="px-3 py-2 font-medium">Employee</th>
                          <th className="px-3 py-2 font-medium">Paid at</th>
                          <th className="px-3 py-2 text-right font-medium">Day rate</th>
                          <th className="px-3 py-2 text-right font-medium">OT · night · night OT</th>
                          <th className="px-3 py-2 text-right font-medium">A day’s pay</th>
                          <th className="px-3 py-2 text-right font-medium">Per month</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {p.lines.map((l) => (
                          <tr key={l.employeeId} className={cn(l.blocked && 'bg-danger-bg/40')}>
                            <td className="px-3 py-2">
                              <span className="font-medium text-text">{l.name}</span>
                              <span className="block text-xs text-text-muted">
                                {l.role} · {l.category}
                              </span>
                              {l.blocked && <span className="block text-xs text-danger-fg">{l.blocked}</span>}
                            </td>
                            <td className="px-3 py-2">
                              {l.onOverride ? <StatusBadge tone="assigned">Own rate</StatusBadge> : <StatusBadge tone="neutral">Role rate</StatusBadge>}
                            </td>
                            <td className="tabular whitespace-nowrap px-3 py-2 text-right">
                              {formatCurrency(l.old.dayRate)} → <strong>{formatCurrency(l.new.dayRate)}</strong>
                            </td>
                            <td className="tabular whitespace-nowrap px-3 py-2 text-right text-text-muted">
                              {formatCurrency(l.new.dayOtRate)} · {formatCurrency(l.new.nightRate)} · {formatCurrency(l.new.nightOtRate)}
                            </td>
                            <td className="tabular whitespace-nowrap px-3 py-2 text-right">
                              {formatCurrency(l.dayPayOld)} → {formatCurrency(l.dayPayNew)}
                            </td>
                            <td className="tabular whitespace-nowrap px-3 py-2 text-right">{signed(l.monthlyChange)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-surface-sunken font-semibold">
                          <td className="px-3 py-2" colSpan={5}>
                            Total monthly cost change ({p.lines.length} employee{p.lines.length === 1 ? '' : 's'})
                          </td>
                          <td className="tabular whitespace-nowrap px-3 py-2 text-right">{signed(p.totalMonthlyChange)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="flex items-start gap-1.5 text-xs text-text-muted">
                    <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Per month = the rate change × each employee’s hours in {periodOf(p.hoursMonth)}. A day’s pay = day rate × the
                    standard hours per day. Starts {formatDate(input.effectiveDate)}.
                  </p>
                  {p.isDecrease && (
                    <div className="rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg px-3 py-3 text-sm text-warning-fg">
                      <p className="mb-2 flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                        Reducing an employee’s pay usually needs their written agreement. Confirm this has been obtained.
                      </p>
                      <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} label="The employees’ written agreement has been obtained" />
                    </div>
                  )}
                  <Input label="Reason" placeholder="e.g. Annual increment, Wages Board revision" value={reason} onChange={(e) => setReason(e.target.value)} />
                </>
              )}
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button disabled={!canSubmit} loading={prepare.isPending} onClick={() => prepare.mutate()}>
                  Send for approval
                </Button>
              </div>
            </div>
          )}
        </MultiStepWizard>
      </Card>
    </div>
  )
}
