import { type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export interface LightConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  /** danger tone for destructive-but-reversible actions (deactivate, discard) */
  tone?: 'default' | 'danger'
  loading?: boolean
  /** optional extra content (e.g. a required reason field) */
  children?: ReactNode
}

/* Lower-stakes, reversible confirmations (approve advance, deactivate) — master §12. */
export function LightConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'default',
  loading,
  children,
}: LightConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            tone === 'danger' ? 'bg-danger-bg text-danger-fg' : 'bg-warning-bg text-warning-fg'
          }`}
        >
          <AlertTriangle className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-heading">{title}</h2>
          <div className="mt-1 text-sm text-text-muted">{message}</div>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </Modal>
  )
}
