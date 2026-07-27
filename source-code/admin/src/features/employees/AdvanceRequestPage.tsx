import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { EMPLOYEES } from './data'
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

  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ employee?: string; amount?: string; reason?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const employee = EMPLOYEES.find((e) => e.id === employeeId)
  const parsedAmount = Number(amount)

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
    setSubmitting(true)
    setTimeout(() => {
      toast(`Advance request of ${formatCurrency(parsedAmount)} for ${employee?.name} submitted for approval`)
      navigate('/employees/advances')
    }, 600)
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
            options={EMPLOYEES.filter((e) => e.status === 'Active').map((e) => ({
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
            <Button variant="secondary" onClick={() => navigate('/employees/advances')}>
              Cancel
            </Button>
            <Button size="lg" onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
