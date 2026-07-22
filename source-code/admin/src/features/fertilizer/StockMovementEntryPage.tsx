import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { BATCHES, REQUESTS, batchStatus } from './data'
import { dispatchableRequests, remainderOf } from './position'
import { formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'

/* FERT-02 validation rules (fertilizer doc + addendum §7). Conditional on movement type. */
const movementSchema = z
  .object({
    type: z.enum(['Incoming', 'Outgoing']),
    batchId: z.string().min(1, 'Select a batch'),
    quantity: z.number({ message: 'Quantity is required' }).positive('Quantity must be a positive number'),
    unit: z.enum(['kg', 'bags']),
    date: z.string().min(1, 'Date is required'),
    // Incoming
    supplier: z.string().optional(),
    lotNumber: z.string().optional(),
    receivedDate: z.string().optional(),
    expiryDate: z.string().optional(),
    // Outgoing
    destination: z.string().optional(),
    linkedRequest: z.string().optional(),
    adHoc: z.boolean().optional(),
    adHocReason: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'Incoming') {
      if (v.batchId === 'new') {
        if (!v.supplier) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Supplier is required' })
        if (!v.lotNumber) ctx.addIssue({ code: 'custom', path: ['lotNumber'], message: 'Batch/lot number is required' })
        else if (BATCHES.some((b) => b.lotNumber.toLowerCase() === v.lotNumber!.toLowerCase()))
          ctx.addIssue({ code: 'custom', path: ['lotNumber'], message: 'Lot number already exists — must be unique' })
      }
      if (!v.expiryDate) ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry date is required' })
      else if (v.expiryDate <= v.date)
        ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry must be after the received date' })
    } else {
      if (!v.destination) ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Destination is required' })
      if (v.batchId === 'new') {
        ctx.addIssue({ code: 'custom', path: ['batchId'], message: 'Outgoing movements must come from an existing batch' })
      } else {
        const batch = BATCHES.find((b) => b.id === v.batchId)
        if (batch && v.quantity > batch.quantityKg)
          ctx.addIssue({
            code: 'custom',
            path: ['quantity'],
            message: `Cannot exceed available stock (${formatWeight(batch.quantityKg)})`,
          })
      }
      // §7 — dispatch must fulfil an approved request, unless explicitly ad-hoc.
      if (!v.adHoc) {
        if (!v.linkedRequest)
          ctx.addIssue({ code: 'custom', path: ['linkedRequest'], message: 'Select an approved request, or mark this dispatch ad-hoc' })
        else {
          const req = REQUESTS.find((r) => r.id === v.linkedRequest)
          if (req && v.quantity > remainderOf(req))
            ctx.addIssue({
              code: 'custom',
              path: ['quantity'],
              message: `Cannot exceed the approved remainder (${formatWeight(remainderOf(req))})`,
            })
        }
      } else if (!v.adHocReason?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['adHocReason'], message: 'A reason is required for an ad-hoc dispatch' })
      }
    }
  })

type MovementForm = z.infer<typeof movementSchema>

const DESTINATIONS = [
  'Green Valley Estate',
  'Hilltop Estate',
  'Mount Rest Estate',
  'Silver Peak Estate',
  'Collection Agent — Route 3',
  'Collection Agent — Route 5',
]

export function StockMovementEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    mode: 'onBlur',
    defaultValues: {
      type: 'Incoming',
      batchId: params.get('batch') ?? '',
      unit: 'kg',
      adHoc: false,
      date: new Date().toISOString().slice(0, 10),
    },
  })
  const values = useWatch({ control })
  const type = values.type ?? 'Incoming'
  const adHoc = values.adHoc ?? false
  const selectedBatch = BATCHES.find((b) => b.id === values.batchId)
  const openRequests = dispatchableRequests()

  const onSubmit = (data: MovementForm) => {
    setSaving(true)
    // Mock save; the typed API layer swaps this for a POST later.
    setTimeout(() => {
      toast('Stock movement recorded')
      void data
      navigate('/fertilizer')
    }, 600)
  }

  const activeBatches = BATCHES.filter((b) => !b.discarded)

  return (
    <div>
      <PageHeader
        title="Log Stock Movement"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: 'Log Movement' },
        ]}
      />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* MovementTypeToggle — segmented, not color-only (icon + label per side) */}
          <div role="radiogroup" aria-label="Movement type" className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'Incoming', icon: <ArrowDownToLine className="size-4" aria-hidden />, hint: 'Stock received' },
                { value: 'Outgoing', icon: <ArrowUpFromLine className="size-4" aria-hidden />, hint: 'Stock dispatched' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={type === opt.value}
                onClick={() => setValue('type', opt.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium transition-colors',
                  type === opt.value
                    ? 'border-primary bg-brand-soft text-primary'
                    : 'border-border text-text-muted hover:bg-surface-hover',
                )}
              >
                <span className="flex items-center gap-1.5">
                  {opt.icon}
                  {opt.value}
                </span>
                <span className="text-xs font-normal text-text-muted">{opt.hint}</span>
              </button>
            ))}
          </div>

          <Select
            label="Batch / item"
            placeholder="Select batch"
            error={errors.batchId?.message}
            options={[
              ...(type === 'Incoming' ? [{ value: 'new', label: '＋ New batch' }] : []),
              ...activeBatches.map((b) => ({
                value: b.id,
                label: `${b.id} — ${b.item} (${formatWeight(b.quantityKg)} available)`,
              })),
            ]}
            {...register('batchId')}
          />
          {type === 'Outgoing' && selectedBatch && batchStatus(selectedBatch) !== 'Fresh' && (
            <p className="-mt-3 text-[13px] text-warning-fg">
              This batch is {batchStatus(selectedBatch).toLowerCase()} — check quality before dispatch.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_140px_1fr]">
            <Input label="Quantity" type="number" min="0" step="any" error={errors.quantity?.message} {...register('quantity', { valueAsNumber: true })} />
            {type === 'Incoming' ? (
              <Select label="Unit" options={[{ value: 'kg', label: 'kg' }, { value: 'bags', label: 'bags' }]} {...register('unit')} />
            ) : (
              // §9 unit canonicalisation — outgoing inherits the item's base unit, not user-selectable
              <Input label="Unit" value="kg" readOnly disabled />
            )}
            <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
          </div>

          {type === 'Incoming' ? (
            <fieldset className="grid gap-4 rounded-[var(--radius-md)] border border-border p-4 sm:grid-cols-2">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Incoming details</legend>
              <Input label="Supplier" error={errors.supplier?.message} {...register('supplier')} />
              <Input label="Batch / lot number" hint="Must be unique." error={errors.lotNumber?.message} {...register('lotNumber')} />
              <Input label="Expiry date" type="date" error={errors.expiryDate?.message} {...register('expiryDate')} />
            </fieldset>
          ) : (
            <fieldset className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-border p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Outgoing details</legend>
              <Select
                label="Destination"
                placeholder="Estate owner or agent"
                error={errors.destination?.message}
                options={DESTINATIONS.map((d) => ({ value: d, label: d }))}
                {...register('destination')}
              />

              {/* §7 — dispatch normally fulfils an approved request; ad-hoc is the audited exception. */}
              <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-surface-sunken px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-text">Dispatch without a request (ad-hoc)</p>
                  <p className="text-xs text-text-muted">Use only when no approved request exists — this is audited.</p>
                </div>
                <Toggle checked={adHoc} onChange={(v) => setValue('adHoc', v)} />
              </div>

              {adHoc ? (
                <Input
                  label="Ad-hoc reason"
                  error={errors.adHocReason?.message}
                  placeholder="e.g. Gate hand-over, request logged retrospectively"
                  {...register('adHocReason')}
                />
              ) : (
                <Select
                  label="Linked fertilizer request"
                  placeholder="Select an approved request"
                  error={errors.linkedRequest?.message}
                  options={openRequests.map((r) => ({
                    value: r.id,
                    label: `${r.id} — ${r.estateName} — ${formatWeight(remainderOf(r))} ${r.item} remaining`,
                  }))}
                  {...register('linkedRequest')}
                />
              )}
            </fieldset>
          )}

          <Input label="Notes" placeholder="Optional" {...register('notes')} />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/fertilizer')} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Movement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
