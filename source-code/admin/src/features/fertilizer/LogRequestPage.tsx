import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Route as RouteIcon, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as estatesService from '@/services/estates'
import * as fertilizerService from '@/services/fertilizer'
import { availableForItem } from './lib'
import { PAYMENT_METHOD_LABEL } from './status'
import type { PaymentMethod } from './types'
import { formatWeight } from '@/lib/format'

interface Line {
  key: number
  item: string
  quantity: string
}

/*
  FERT-07 — Log a phoned-in order on the owner's behalf (Fertilizer-Delivery-Addendum §4).
  One order may list several items; the server creates one request per item, all sharing an
  order reference so they display and deliver together. The route comes from the estate (the
  client never chooses it). Logging does NOT approve — every line enters the FERT-05 queue.
*/
export function LogRequestPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const {
    data: estates,
    isPending: estatesPending,
    isError: estatesError,
    refetch: refetchEstates,
  } = useQuery({ queryKey: ['estates'], queryFn: estatesService.list })
  const {
    data: batches,
    isPending: batchesPending,
    isError: batchesError,
    refetch: refetchBatches,
  } = useQuery({ queryKey: ['fertilizer', 'batches'], queryFn: fertilizerService.listBatches })
  const { data: positions } = useQuery({ queryKey: ['fertilizer', 'positions'], queryFn: fertilizerService.listPositions })

  const items = useMemo(() => [...new Set((batches ?? []).map((b) => b.item))].sort(), [batches])

  const [estateId, setEstateId] = useState('')
  const [lines, setLines] = useState<Line[]>([{ key: 1, item: '', quantity: '' }])
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ estate?: string; method?: string; lines?: Record<number, { item?: string; quantity?: string }> }>({})

  const estate = estates?.find((e) => e.id === estateId)

  const createMutation = useMutation({
    mutationFn: () =>
      fertilizerService.createOrder({
        estateId,
        items: lines.map((l) => ({ item: l.item, quantityKg: Number(l.quantity) })),
        paymentMethod: method as PaymentMethod,
        reason: reason.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast(
        res.requests.length === 1
          ? `Request ${res.requests[0].id} logged for approval`
          : `Order ${res.orderRef} logged — ${res.requests.length} requests for approval`,
      )
      void queryClient.invalidateQueries({ queryKey: ['fertilizer'] })
      navigate('/fertilizer/requests')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not log this order', 'danger'),
  })

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const validate = () => {
    const next: typeof errors = { lines: {} }
    if (!estateId) next.estate = 'Select an estate owner'
    if (!method) next.method = 'Choose how the owner will pay'
    const seen = new Set<string>()
    for (const l of lines) {
      const e: { item?: string; quantity?: string } = {}
      const qty = Number(l.quantity)
      if (!l.item) e.item = 'Select an item'
      else if (seen.has(l.item)) e.item = 'Already on this order'
      if (!l.quantity || Number.isNaN(qty) || qty <= 0) e.quantity = 'Enter a positive quantity'
      seen.add(l.item)
      if (e.item || e.quantity) next.lines![l.key] = e
    }
    setErrors(next)
    return !next.estate && !next.method && Object.keys(next.lines!).length === 0
  }

  if (estatesPending || batchesPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (estatesError || batchesError || !estates || !batches) {
    return (
      <ErrorState
        title="Couldn't load estates or stock data"
        description="Something went wrong fetching the data this form needs."
        onRetry={() => {
          void refetchEstates()
          void refetchBatches()
        }}
      />
    )
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

      <Card className="max-w-2xl">
        <div className="flex flex-col gap-5">
          <Select
            label="Estate owner"
            placeholder="Select estate owner"
            value={estateId}
            error={errors.estate}
            onChange={(e) => setEstateId(e.target.value)}
            options={estates
              .filter((o) => o.status === 'Active')
              .map((o) => ({ value: o.id, label: `${o.ownerName} — ${o.estateName}` }))}
          />
          {estate && (
            <p className="-mt-2 flex items-center gap-1.5 text-[13px] text-text-muted">
              <RouteIcon className="size-3.5" aria-hidden />
              {estate.selfDelivery ? (
                <span className="text-warning-fg">
                  This estate delivers its own tea, so no agent visits it — fertilizer can’t go out on a route stop yet.
                </span>
              ) : (
                <>
                  Delivered with the collection on <span className="font-medium text-text">{estate.route || 'its route'}</span>
                </>
              )}
            </p>
          )}

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Items</legend>
            {lines.map((l) => {
              const available = l.item && positions ? availableForItem(l.item, positions) : null
              const err = errors.lines?.[l.key]
              return (
                <div key={l.key} className="rounded-[var(--radius-md)] border border-border p-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                    <Select
                      label="Item"
                      placeholder="Select item"
                      value={l.item}
                      error={err?.item}
                      onChange={(e) => setLine(l.key, { item: e.target.value })}
                      options={items.map((i) => ({ value: i, label: i }))}
                    />
                    <Input
                      label="Quantity (kg)"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={l.quantity}
                      error={err?.quantity}
                      onChange={(e) => setLine(l.key, { quantity: e.target.value })}
                      placeholder="200"
                    />
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        iconOnly
                        aria-label="Remove this item"
                        disabled={lines.length === 1}
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  {available !== null && (
                    <p className="mt-2 text-[13px] text-text-muted">
                      Available now:{' '}
                      <span className={`tabular font-semibold ${available < 0 ? 'text-danger-fg' : 'text-text'}`}>
                        {formatWeight(available)}
                      </span>{' '}
                      — stock is committed at approval, not now.
                    </p>
                  )}
                </div>
              )
            })}
            <div>
              <Button
                variant="secondary"
                size="sm"
                disabled={lines.length >= 10}
                onClick={() => setLines((ls) => [...ls, { key: Math.max(...ls.map((x) => x.key)) + 1, item: '', quantity: '' }])}
              >
                <Plus className="size-4" /> Add another item
              </Button>
            </div>
          </fieldset>

          <Select
            label="How the owner will pay"
            placeholder="Choose a payment method"
            value={method}
            error={errors.method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            options={(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
              value: m,
              label: PAYMENT_METHOD_LABEL[m],
            }))}
          />

          <Input
            label="Reason for logging outside the app"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Owner has no signal — phoned the factory"
          />

          <p className="text-xs text-text-muted">
            Each item becomes its own request, recorded as <strong>Requested</strong> in the approval queue — logging and
            approving are separate steps. The owner can change the payment method until delivery.
          </p>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => navigate('/fertilizer/requests')} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => validate() && createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!!estate?.selfDelivery}
            >
              Log {lines.length > 1 ? `${lines.length} Requests` : 'Request'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
