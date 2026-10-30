import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as employeesService from '@/services/employees'
import { formatCurrency } from '@/lib/format'

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
  const [errors, setErrors] = useState<{ employee?: string; amount?: string; reason?: string }>({})

  const employee = (employees ?? []).find((e) => e.id === employeeId)
  const parsedAmount = Number(amount)

  const requestMutation = useMutation({
    mutationFn: () => employeesService.requestAdvance({ employeeId, amount: parsedAmount, reason }),
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
          <Select
            label="Employee"
            placeholder="Select employee"
            value={employeeId}
            error={errors.employee}
            onChange={(e) => setEmployeeId(e.target.value)}
            options={(employees ?? []).filter((e) => e.status === 'Active').map((e) => ({
              value: e.id,
              label: `${e.name} — ${e.role}`,
            }))}
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
          <p className="text-xs text-text-muted">
            The request is recorded as Pending and deducted from salary only after approval at month-end payroll.
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
