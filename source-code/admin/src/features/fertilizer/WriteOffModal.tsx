import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import * as fertilizerService from '@/services/fertilizer'
import { formatWeight } from '@/lib/format'
import type { FertilizerBatch, WriteOffReason } from './types'

const REASONS: { value: WriteOffReason; label: string }[] = [
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'other', label: 'Other' },
]

/**
 * Expiry Alerts / FERT-03 "Write off" — replaces "Mark Discarded". Writes a Write-off stock
 * movement (reason required, quantity defaults to what's left), so the batch leaves Expired and
 * FERT-01's "kg expired" drops by the same amount. While an expired batch is still allocated to a
 * request it can't be written off; `blockedBy` lists those requests to move to live stock first.
 */
export function WriteOffModal({
  batch,
  blockedBy = [],
  onClose,
  onDone,
}: {
  batch: FertilizerBatch
  blockedBy?: { requestId: string; kg: number }[]
  onClose: () => void
  onDone?: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const expired = batch.status === 'Expired'
  const [reason, setReason] = useState<WriteOffReason>(expired ? 'expired' : 'damaged')
  const [qty, setQty] = useState(String(batch.quantityKg))
  const [note, setNote] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  // on a live batch only the free kg can go; an expired one goes whole once nothing holds it
  const max = expired ? batch.quantityKg : batch.freeKg
  const amount = Number(qty)
  const qtyInvalid = qty === '' || !(amount > 0) || amount > max
  const noteMissing = reason === 'other' && note.trim().length < 3
  const blocked = expired && blockedBy.length > 0

  const mutation = useMutation({
    mutationFn: () =>
      fertilizerService.writeOffBatch(batch.id, {
        reason,
        quantityKg: amount,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: () => {
      toast(`${formatWeight(amount)} of ${batch.id} written off`, 'warning')
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
      onDone?.()
      onClose()
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Could not write off this batch'),
  })

  return (
    <LightConfirmModal
      open
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      tone="danger"
      title={`Write off ${batch.id}`}
      confirmLabel="Write off"
      loading={mutation.isPending}
      confirmDisabled={blocked || qtyInvalid || noteMissing}
      message={
        <>
          <strong>{batch.item}</strong> · {formatWeight(batch.quantityKg)} left
          {!expired && ` (${formatWeight(batch.freeKg)} free)`}. The stock leaves the books as a write-off. It is
          never dispatched and never counted as an expense.
        </>
      }
    >
      {blocked ? (
        <div className="rounded-[var(--radius-md)] border border-danger-fg/25 bg-danger-bg p-3 text-sm text-danger-fg">
          <p className="font-medium">Still allocated: move these requests to live stock first.</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {blockedBy.map((a) => (
              <li key={a.requestId}>
                <Link to={`/fertilizer/requests/${a.requestId}`} className="id underline underline-offset-2">
                  {a.requestId}
                </Link>{' '}
                · {formatWeight(a.kg)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Select
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as WriteOffReason)}
            options={REASONS}
          />
          <Input
            label="Quantity (kg)"
            type="number"
            min="0"
            max={String(max)}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            error={qty !== '' && qtyInvalid ? `Enter more than 0 and at most ${formatWeight(max)}.` : undefined}
          />
          <Input
            label={reason === 'other' ? 'Note' : 'Note (optional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={reason === 'other' ? 'Required: what happened' : ''}
            error={noteMissing && note !== '' ? 'Say what happened (at least 3 characters).' : undefined}
          />
          {serverError && <p className="text-sm text-danger-fg">{serverError}</p>}
        </div>
      )}
    </LightConfirmModal>
  )
}
