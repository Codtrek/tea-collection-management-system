import { useState } from 'react'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/format'

/**
 * Cancel a scheduled version before it starts (Administration-Addendum §1). The version is kept
 * and marked cancelled, never deleted; the reason goes to the audit log.
 */
export function CancelVersionModal({
  what,
  effectiveDate,
  loading,
  onCancel,
  onClose,
}: {
  /** "grade rates", "transport rates", "the Urea price" */
  what: string
  effectiveDate: string
  loading: boolean
  onCancel: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <LightConfirmModal
      open
      onClose={onClose}
      onConfirm={() => onCancel(reason.trim())}
      loading={loading}
      confirmDisabled={reason.trim().length < 3}
      title="Cancel scheduled version"
      confirmLabel="Cancel version"
      cancelLabel="Keep it"
      message={
        <>
          The {what} due to start on <strong>{formatDate(effectiveDate)}</strong> won’t take effect. The version is kept,
          marked cancelled, and recorded in the audit log.
        </>
      }
    >
      <div className="mt-3">
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Board withdrew the increase" />
      </div>
    </LightConfirmModal>
  )
}
