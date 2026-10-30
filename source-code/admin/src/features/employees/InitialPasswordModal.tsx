import { useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface InitialPasswordModalProps {
  name: string
  phone: string
  password: string
  onDone: () => void
}

/*
  Shown ONCE after registering (or re-roling) a Tea Collecting Agent. The temporary password is
  never stored in plain text and is not shown again — the admin hands it to the agent, who must
  change it on first sign-in in the mobile app.
*/
export function InitialPasswordModal({ name, phone, password, onDone }: InitialPasswordModalProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      /* clipboard can be blocked — the password is still on screen to copy by hand */
    }
  }

  return (
    <Modal
      open
      onClose={onDone}
      hideClose
      footer={<Button onClick={onDone}>I’ve passed it on — continue</Button>}
    >
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
          <KeyRound className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-heading">Mobile login created for {name}</h2>
          <p className="mt-1 text-sm text-text-muted">
            They sign in to the collection app with their contact number and this temporary password, and are asked to
            choose their own on first sign-in. <strong className="text-text">It is shown only once.</strong>
          </p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3.5 text-sm">
            <dt className="text-text-muted">Sign-in (phone)</dt>
            <dd className="id text-text">{phone}</dd>
            <dt className="text-text-muted">Temporary password</dt>
            <dd className="flex items-center gap-2">
              <code className="id select-all rounded bg-surface px-2 py-0.5 text-text-heading">{password}</code>
              <button
                type="button"
                onClick={() => void copy()}
                aria-label="Copy temporary password"
                className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover hover:text-text"
              >
                {copied ? <Check className="size-4 text-success-fg" /> : <Copy className="size-4" />}
              </button>
            </dd>
          </dl>
        </div>
      </div>
    </Modal>
  )
}
