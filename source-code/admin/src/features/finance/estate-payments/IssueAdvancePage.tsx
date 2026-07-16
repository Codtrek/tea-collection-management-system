import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { HighStakesConfirmFlow } from '@/components/patterns/HighStakesConfirmFlow'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { ESTATES } from './data'
import { formatCurrency } from '@/lib/format'

/*
  EST-06 — Issue Advance Payment. Real money leaves the factory immediately
  (unlike EMP-10 salary advances, which only move at payroll), so this uses
  the full HighStakesConfirmFlow, not a LightConfirmModal.
*/
export function IssueAdvancePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [params] = useSearchParams()

  const [estateId, setEstateId] = useState(params.get('estate') ?? '')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ estate?: string; amount?: string; reason?: string }>({})
  const [confirming, setConfirming] = useState(false)
  const [issuing, setIssuing] = useState(false)

  const estate = ESTATES.find((e) => e.id === estateId)
  const parsedAmount = Number(amount)

  const validate = () => {
    const next: typeof errors = {}
    if (!estateId) next.estate = 'Select an estate owner'
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) next.amount = 'Enter a positive amount'
    if (!reason.trim()) next.reason = 'Reason is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const issue = () => {
    setIssuing(true)
    setTimeout(() => {
      // Audit trail entry per the module doc.
      toast(`Advance of ${formatCurrency(parsedAmount)} issued to ${estate?.estateName} by ${user?.name}`)
      navigate('/estates/advances')
    }, 600)
  }

  return (
    <div>
      <PageHeader
        title="Issue Advance Payment"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Estate Owners', to: '/estates' },
          { label: 'Advances', to: '/estates/advances' },
          { label: 'Issue' },
        ]}
      />

      <Card className="max-w-xl">
        <div className="flex flex-col gap-5">
          <Select
            label="Estate owner"
            placeholder="Select estate"
            value={estateId}
            error={errors.estate}
            onChange={(e) => setEstateId(e.target.value)}
            options={ESTATES.filter((e) => e.status === 'Active').map((e) => ({
              value: e.id,
              label: `${e.estateName} — ${e.ownerName}`,
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
            placeholder="50000"
          />
          <Input
            label="Reason"
            value={reason}
            error={errors.reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Pre-season plucking labour costs"
          />
          {estate && !estate.bank.account && (
            <p className="rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg/60 p-3 text-sm text-text">
              <strong className="text-warning-fg">No bank details on file</strong> — this advance would need to be paid
              in cash and the estate stays excluded from settlement runs until bank details are added.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => navigate('/estates/advances')}>
              Cancel
            </Button>
            <Button size="lg" onClick={() => validate() && setConfirming(true)}>
              Issue Advance
            </Button>
          </div>
        </div>
      </Card>

      <HighStakesConfirmFlow
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={issue}
        loading={issuing}
        title="Confirm advance payment"
        amount={parsedAmount || 0}
        confirmLabel="Issue Advance"
        review={
          <div className="rounded-[var(--radius-md)] border border-border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Estate owner</span>
              <span className="font-medium text-text">{estate?.estateName}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-text-muted">Reason</span>
              <span className="max-w-[60%] text-right text-text">{reason}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-medium text-text">Amount to issue now</span>
              <span className="tabular font-semibold text-text-heading">{formatCurrency(parsedAmount || 0)}</span>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Money moves immediately and is deducted at this estate's next settlement. This cannot be undone.
            </p>
          </div>
        }
      />
    </div>
  )
}
