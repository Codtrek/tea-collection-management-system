import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/components/ui/Toast'
import { ESTATES } from '@/features/estates/data'
import { BATCHES } from './data'
import { availableForItem } from './position'
import { formatWeight } from '@/lib/format'

/*
  FERT-07 — Log a phoned-in fertilizer request (addendum §3/§6). The exception path
  for rural connectivity: recorded on the owner's behalf, web-originated, entering the
  same approval queue as any mobile request. It does NOT auto-approve.
*/
export function LogRequestPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const items = useMemo(() => [...new Set(BATCHES.map((b) => b.item))], [])
  const today = new Date().toISOString().slice(0, 10)

  const [estate, setEstate] = useState('')
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(today)
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [errors, setErrors] = useState<{ estate?: string; item?: string; quantity?: string; date?: string }>({})
  const [saving, setSaving] = useState(false)

  const qty = Number(quantity)
  const available = item ? availableForItem(item) : null

  const validate = () => {
    const next: typeof errors = {}
    if (!estate) next.estate = 'Select an estate owner'
    if (!item) next.item = 'Select an item'
    if (!quantity || Number.isNaN(qty) || qty <= 0) next.quantity = 'Enter a positive quantity'
    if (!date) next.date = 'Date is required'
    else if (date > today) next.date = 'Date cannot be in the future'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = () => {
    if (!validate()) return
    setSaving(true)
    setTimeout(() => {
      toast(`Request for ${formatWeight(qty)} of ${item} logged for approval${notify ? ' · owner notified' : ''}`)
      navigate('/fertilizer/requests')
    }, 600)
  }

  return (
    <div>
      <PageHeader
        title="Log Phoned-in Request"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: 'Requests', to: '/fertilizer/requests' },
          { label: 'New Request' },
        ]}
      />

      <Card className="max-w-xl">
        <div className="flex flex-col gap-5">
          <Select
            label="Estate owner"
            placeholder="Select estate owner"
            value={estate}
            error={errors.estate}
            onChange={(e) => setEstate(e.target.value)}
            options={ESTATES.map((o) => ({ value: o.estateName, label: `${o.ownerName} — ${o.estateName}` }))}
          />

          <div className="grid gap-4 sm:grid-cols-[1fr_140px_120px]">
            <Select
              label="Item"
              placeholder="Select item"
              value={item}
              error={errors.item}
              onChange={(e) => setItem(e.target.value)}
              options={items.map((i) => ({ value: i, label: i }))}
            />
            <Input
              label="Quantity"
              type="number"
              min="0"
              inputMode="numeric"
              value={quantity}
              error={errors.quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="200"
            />
            {/* Unit is read-only — the item's base unit (§9 unit canonicalisation) */}
            <Input label="Unit" value="kg" readOnly disabled />
          </div>

          {available !== null && (
            <p className="-mt-2 text-[13px] text-text-muted">
              Currently available for <span className="font-medium text-text">{item}</span>:{' '}
              <span className={`tabular font-semibold ${available < 0 ? 'text-danger-fg' : 'text-text'}`}>
                {formatWeight(available)}
              </span>{' '}
              — availability is confirmed at approval, not now.
            </p>
          )}

          <Input label="Requested date" type="date" max={today} value={date} error={errors.date} onChange={(e) => setDate(e.target.value)} />

          <Input
            label="Reason for logging outside the app"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Owner has no signal — phoned the factory"
          />

          <Checkbox label="Notify the estate owner that this request was logged" checked={notify} onChange={(e) => setNotify(e.target.checked)} />

          <p className="text-xs text-text-muted">
            The request is recorded as <strong>Submitted</strong> and enters the approval queue — logging and approving
            are separate steps.
          </p>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => navigate('/fertilizer/requests')} disabled={saving}>
              Cancel
            </Button>
            <Button size="lg" onClick={submit} loading={saving}>
              Log Request
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
