import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Combobox } from '@/components/ui/Combobox'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as employeesService from '@/services/employees'
import { formatCurrency } from '@/lib/format'
import { currentMonth } from '@/lib/month'
import { defaultStartMonth, planInstallment, planValueError, type PlanValue } from './advance-plan'
import { RepaymentPlanFields } from './RepaymentPlanFields'

/*
  New salary advance request, entered by staff on an employee's behalf
  (e.g. a request made on paper or in person). No money moves here — the
  request lands as Pending and only affects pay after EMP-10 approval,
  so unlike EST-06 this is a plain submit, not a HighStakesConfirmFlow.
*/
export function AdvanceRequestPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: employees, isPending, isError, refetch } = useQuery({ queryKey: ['employees'], queryFn: employeesService.list })

  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ employee?: string; amount?: string; reason?: string; plan?: string }>({})
  const thisMonth = currentMonth()
  const [plan, setPlan] = useState<PlanValue>({ mode: 'single', installment: '', months: '', startMonth: defaultStartMonth(thisMonth) })
  const { data: rules } = useQuery({ queryKey: ['employees', 'advances', 'rules'], queryFn: employeesService.getAdvanceRules })
  const maxMonths = rules?.maxInstallmentMonths ?? 6

  const employee = (employees ?? []).find((e) => e.id === employeeId)
  const activeEmployees = (employees ?? []).filter((e) => e.status === 'Active').sort((a, b) => a.name.localeCompare(b.name))
  // the same balance payroll recovers from (backend advance-balance.ts)
  const { data: balance } = useQuery({
    queryKey: ['employees', 'advances', 'employee', employeeId],
    queryFn: () => employeesService.getEmployeeAdvances(employeeId),
    enabled: !!employeeId,
  })
  const openAdvance = balance?.advances.find((a) => a.status === 'Pending' || (a.status === 'Approved' && a.remaining > 0))
  const parsedAmount = Number(amount)

  const requestMutation = useMutation({
    mutationFn: () =>
      employeesService.requestAdvance({
        employeeId,
        amount: parsedAmount,
        reason,
        repayment: plan.mode,
        installmentAmount: plan.mode === 'installments' ? planInstallment(parsedAmount, plan) : undefined,
        startMonth: plan.startMonth,
      }),
    onSuccess: () => {
      toast(`Advance request of ${formatCurrency(parsedAmount)} for ${employee?.name} submitted for approval`)
      void queryClient.invalidateQueries({ queryKey: ['employees', 'advances'] })
      navigate('/employees/advances')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not submit this advance request', 'danger'),
  })

  const validate = () => {
    const next: typeof errors = {}
    if (!employeeId) next.employee = 'Select an employee'
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) next.amount = 'Enter a positive amount'
    if (!reason.trim()) next.reason = 'Reason is required'
    const planProblem = parsedAmount > 0 ? planValueError(parsedAmount, plan, maxMonths) : null
    if (planProblem) next.plan = planProblem
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = () => {
    if (!validate()) return
    requestMutation.mutate()
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Couldn't load employees" description="Something went wrong fetching the employee roster." onRetry={() => void refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="New Advance Request"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Salary Advances', to: '/employees/advances' },
          { label: 'New Request' },
        ]}
      />

      <Card className="max-w-xl">
        <div className="flex flex-col gap-5">
          <Combobox
            label="Employee"
            placeholder="Search by name or employee ID…"
            noun="employees"
            items={activeEmployees}
            value={employeeId}
            onChange={setEmployeeId}
            getKey={(e) => e.id}
            getLabel={(e) => e.name}
            getMeta={(e) => `${e.id} · ${e.role}`}
            error={errors.employee}
            hint={
              employeeId && balance ? (
                <span className={openAdvance ? 'text-warning-fg' : undefined}>
                  Outstanding advances: {formatCurrency(balance.outstanding)}
                  {openAdvance &&
                    ` — they already have an open advance (${openAdvance.id}, ${openAdvance.status === 'Pending' ? 'waiting for a decision' : `${formatCurrency(openAdvance.remaining)} left`}).`}
                </span>
              ) : undefined
            }
          />
          <Input
            label="Amount (Rs.)"
            type="number"
            min="0"
            inputMode="numeric"
            value={amount}
            error={errors.amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="15000"
          />
          <Input
            label="Reason"
            value={reason}
            error={errors.reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Medical expenses"
          />
          <RepaymentPlanFields amount={parsedAmount} value={plan} onChange={setPlan} maxMonths={maxMonths} firstMonth={thisMonth} />
          <p className="text-xs text-text-muted">
            The request is recorded as Pending and deducted from salary only after approval. Each month deducts at most{' '}
            {rules?.advanceDeductionCapPct ?? 50}% of that month's gross; anything it can't take carries forward.
          </p>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => navigate('/employees/advances')} disabled={requestMutation.isPending}>
              Cancel
            </Button>
            <Button size="lg" onClick={submit} loading={requestMutation.isPending}>
              Submit Request
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
