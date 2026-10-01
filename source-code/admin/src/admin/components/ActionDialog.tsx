import { useState } from 'react'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Textarea } from '@/components/ui/Textarea'

interface ActionDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  reason?: { label: string; placeholder?: string; required?: boolean; minLength?: number }
  onConfirm: (reason: string) => void
}

/* Confirm modal with an optional (or required) reason field, built on LightConfirmModal. */
export function ActionDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  destructive,
  reason,
  onConfirm,
}: ActionDialogProps) {
  const [text, setText] = useState('')

  const min = reason?.required ? (reason.minLength ?? 10) : 0
  const invalid = text.trim().length < min

  const close = () => {
    setText('')
    onClose()
  }

  return (
    <LightConfirmModal
      open={open}
      onClose={close}
      title={title}
      message={description}
      confirmLabel={confirmLabel}
      tone={destructive ? 'danger' : 'default'}
      confirmDisabled={invalid}
      onConfirm={() => {
        onConfirm(text.trim())
        close()
      }}
    >
      {reason && (
        <Textarea
          label={reason.required ? reason.label : `${reason.label} (optional)`}
          rows={4}
          value={text}
          placeholder={reason.placeholder}
          hint={reason.required ? `The factory will see this message. At least ${min} characters.` : undefined}
          onChange={(e) => setText(e.target.value)}
        />
      )}
    </LightConfirmModal>
  )
}
