import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as fertilizerService from '@/services/fertilizer'
import { batchStatus } from './lib'
import type { FertilizerBatch } from './types'
import { formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'

/* FERT-02 validation rules (fertilizer doc + addendum §7). Conditional on movement type.
   Takes the live batch list as an argument — the uniqueness checks read whatever was last
   fetched from the backend, never a module-level fixture. Outgoing is ad-hoc only
   (Fertilizer-Delivery-Addendum §5): a request's fertilizer leaves through its handover. */
function buildMovementSchema(batches: FertilizerBatch[]) {
  return z
    .object({
      type: z.enum(['Incoming', 'Outgoing']),
      batchId: z.string().min(1, 'Select a batch'),
      quantity: z.number({ message: 'Quantity is required' }).positive('Quantity must be a positive number'),
      unit: z.enum(['kg', 'bags']),
      date: z.string().min(1, 'Date is required'),
      // Incoming
      item: z.string().optional(),
      supplier: z.string().optional(),
      lotNumber: z.string().optional(),
      expiryDate: z.string().optional(),
      // Outgoing
      destination: z.string().optional(),
      adHocReason: z.string().optional(),
      notes: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (v.type === 'Incoming') {
        if (v.batchId === 'new') {
          if (!v.item) ctx.addIssue({ code: 'custom', path: ['item'], message: 'Item is required' })
          if (!v.supplier) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Supplier is required' })
          if (!v.lotNumber) ctx.addIssue({ code: 'custom', path: ['lotNumber'], message: 'Batch/lot number is required' })
          else if (batches.some((b) => b.lotNumber.toLowerCase() === v.lotNumber!.toLowerCase()))
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
          const batch = batches.find((b) => b.id === v.batchId)
          if (batch && v.quantity > batch.quantityKg)
            ctx.addIssue({
              code: 'custom',
              path: ['quantity'],
              message: `Cannot exceed available stock (${formatWeight(batch.quantityKg)})`,
            })
        }
        if (!v.adHocReason?.trim()) {
          ctx.addIssue({ code: 'custom', path: ['adHocReason'], message: 'A reason is required for an ad-hoc dispatch' })
        }
      }
    })
}

type MovementForm = z.infer<ReturnType<typeof buildMovementSchema>>

const DESTINATIONS = [
  'Green Valley Estate',
  'Hilltop Estate',
  'Mount Rest Estate',
  'Silver Peak Estate',
  'Collection Agent — Route 3',
  'Collection Agent — Route 5',
]

export function StockMovementEntryPage() {
  const {
    data: batches,
    isPending: batchesPending,
    isError: batchesError,
    refetch: refetchBatches,
  } = useQuery({ queryKey: ['fertilizer', 'batches'], queryFn: fertilizerService.listBatches })
  if (batchesPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (batchesError || !batches) {
    return (
      <ErrorState
        title="Couldn't load stock data"
        description="Something went wrong fetching batches."
        onRetry={() => void refetchBatches()}
      />
    )
  }

  return <MovementForm batches={batches} />
}

function MovementForm({ batches }: { batches: FertilizerBatch[] }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<MovementForm>({
    resolver: zodResolver(buildMovementSchema(batches)),
    mode: 'onBlur',
    defaultValues: {
      type: 'Incoming',
      batchId: params.get('batch') ?? '',
      unit: 'kg',
      date: new Date().toISOString().slice(0, 10),
    },
  })
  const values = useWatch({ control })
  const type = values.type ?? 'Incoming'
  const selectedBatch = batches.find((b) => b.id === values.batchId)

  const recordMutation = useMutation({
    mutationFn: (input: fertilizerService.RecordMovementInput) => fertilizerService.recordMovement(input),
    onSuccess: () => {
      toast('Stock movement recorded')
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
      navigate('/fertilizer')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not record this movement', 'danger'),
  })

  const onSubmit = (data: MovementForm) => {
    if (data.type === 'Incoming') {
      recordMutation.mutate({
        type: 'Incoming',
        quantityKg: data.quantity,
        date: data.date,
        notes: data.notes || undefined,
        supplier: data.supplier || undefined,
        ...(data.batchId === 'new'
          ? {
              // Category has no field in this quick-entry form — new batches
              // default to Fertilizer; Beneficiary items are registered
              // directly via `POST /fertilizer/batches` for now.
              item: data.item,
              category: 'Fertilizer' as const,
              unit: data.unit,
              lotNumber: data.lotNumber,
              expiryDate: data.expiryDate,
            }
          : { batchId: data.batchId }),
      })
    } else {
      recordMutation.mutate({
        type: 'Outgoing',
        quantityKg: data.quantity,
        date: data.date,
        batchId: data.batchId,
        destination: data.destination,
        notes: `Ad-hoc dispatch — ${data.adHocReason}${data.notes ? ` · ${data.notes}` : ''}`,
      })
    }
  }

  const activeBatches = batches.filter((b) => !b.discarded)

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
              {values.batchId === 'new' && (
                <Input label="Item" error={errors.item?.message} {...register('item')} />
              )}
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

              {/* Fertilizer-Delivery-Addendum §5 — a request's fertilizer goes out through its handover,
                  so this form is only for ad-hoc stock (audited, needs a reason). */}
              <p className="rounded-[var(--radius-sm)] bg-surface-sunken px-3 py-2 text-xs text-text-muted">
                Fertilizer for an approved request goes out from the request itself (Record handover), on its route
                stop. Use this only for stock that isn’t for a request — it can’t take stock committed to requests.
              </p>
              <Input
                label="Reason for this dispatch"
                error={errors.adHocReason?.message}
                placeholder="e.g. Replacement for a damaged bag, demo plot"
                {...register('adHocReason')}
              />
            </fieldset>
          )}

          <Input label="Notes" placeholder="Optional" {...register('notes')} />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/fertilizer')} disabled={recordMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={recordMutation.isPending}>
              Save Movement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
