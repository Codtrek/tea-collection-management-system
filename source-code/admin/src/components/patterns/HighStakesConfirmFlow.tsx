import { useState, type ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'

export interface HighStakesConfirmFlowProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  /** review content — breakdown table, warnings, etc. */
  review: ReactNode
  /** the total amount the user must re-confirm by typing */
  amount: number
  confirmLabel?: string
  loading?: boolean
}

/*
  High-stakes, irreversible & financial actions (master §12). Unlike the light
  modal's generic "Are you sure?", this requires the user to RE-TYPE the exact
  total before the irreversible action unlocks. First built for EMP-12 Payroll,
  reused by EST-06/EST-08. Irreversible ≠ destructive, so the confirm button is
  primary (green), never danger/red (foundations §4).
*/
export function HighStakesConfirmFlow({
  open,
  onClose,
  onConfirm,
  title,
  review,
  amount,
  confirmLabel = 'Process',
  loading,
}: HighStakesConfirmFlowProps) {
  const [typed, setTyped] = useState('')
  const expected = String(Math.round(amount))
  const matches = typed.replace(/[,\s]/g, '') === expected

  const close = () => {
    setTyped('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-warning-bg text-warning-fg">
            <ShieldAlert className="size-4" />
          </span>
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button size="lg" onClick={onConfirm} disabled={!matches} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {review}
        <div className="rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg/60 p-4">
          <p className="text-sm font-medium text-text">
            This action is irreversible. Confirm the total{' '}
            <span className="tabular font-semibold">{formatCurrency(amount)}</span> by re-typing the amount.
          </p>
          <div className="mt-3 max-w-xs">
            <Input
              label={`Re-type ${expected}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={expected}
              inputMode="numeric"
              error={typed && !matches ? "Amount doesn't match" : undefined}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
