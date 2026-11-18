import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate } from '@/lib/format'
import { factoryToday } from '@/features/dispatch/status'
import * as fertilizerService from '@/services/fertilizer'
import type { FertilizerPrice } from '@/features/fertilizer/types'
import { CancelVersionModal } from './CancelVersionModal'
import { VERSION_BADGE, addDays, dateTaken, sameDraft, versionBefore } from './factory-setup-model'

/*
  Item Prices (Administration-Addendum §5) — the ONE selling-price source for fertilizer and other
  items given to estate owners, versioned like grade rates. A price applies by APPROVAL date: a
  request keeps the per-kg price snapshotted when it was approved. The average purchase cost of
  recent stock-ins is shown beside it, for information, with a warning when selling below cost.
  `readOnly` is the Officer / Manager view (itemPrices: view).
*/

export interface PriceDraft {
  item: string
  unit: 'kg' | 'bag'
  bagSizeKg: string
  pricePerUnit: string
  effectiveDate: string
  reason: string
}

const perKg = (unit: 'kg' | 'bag', price: number, bag: number) => (unit === 'bag' ? Math.round((price / bag) * 100) / 100 : price)
const priceLabel = (p: Pick<FertilizerPrice, 'unit' | 'pricePerUnit' | 'bagSizeKg'>) =>
  p.unit === 'bag' ? `${formatCurrency(p.pricePerUnit)} per ${p.bagSizeKg} kg bag` : `${formatCurrency(p.pricePerUnit)}/kg`

export function ItemPricesTab({
  readOnly = false,
  draft = null,
  onDraft = () => {},
}: {
  readOnly?: boolean
  draft?: PriceDraft | null
  onDraft?: (d: PriceDraft | null) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const today = factoryToday()
  const [open, setOpen] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState<FertilizerPrice | null>(null)
  const prices = useQuery({ queryKey: ['fertilizer', 'prices'], queryFn: fertilizerService.listPrices })
  const costs = useQuery({ queryKey: ['fertilizer', 'prices', 'costs'], queryFn: fertilizerService.listPurchaseCosts })

  const onSaved = (rows: FertilizerPrice[], message: string) => {
    queryClient.setQueryData(['fertilizer', 'prices'], rows)
    toast(message)
  }
  const publish = useMutation({
    mutationFn: (d: PriceDraft) =>
      fertilizerService.setPrice({
        item: d.item,
        unit: d.unit,
        ...(d.unit === 'bag' ? { bagSizeKg: Number(d.bagSizeKg) } : {}),
        pricePerUnit: Number(d.pricePerUnit),
        effectiveDate: d.effectiveDate,
        reason: d.reason.trim(),
      }),
    onSuccess: (rows, d) => {
      onSaved(rows, `${d.item}: new price published, and recorded in the audit log`)
      setConfirming(false)
      onDraft(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not publish the price', 'danger'),
  })
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => fertilizerService.cancelPrice(id, reason),
    onSuccess: (rows) => {
      onSaved(rows, 'Scheduled price cancelled, and recorded in the audit log')
      setCancelling(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not cancel the price', 'danger'),
  })

  if (prices.isPending) return <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
  if (prices.isError || !prices.data) return <ErrorState title="Couldn't load item prices" onRetry={() => void prices.refetch()} />

  const rows = prices.data
  const costOf = new Map((costs.data ?? []).map((c) => [c.item, c]))
  const items = [...new Set([...rows.map((r) => r.item), ...(costs.data ?? []).map((c) => c.item)])].sort()
  const versionsOf = (item: string) => rows.filter((r) => r.item === item)
  const currentOf = (item: string) => versionsOf(item).find((r) => r.current) ?? null
  const nextOf = (item: string) =>
    versionsOf(item)
      .filter((r) => r.status === 'scheduled')
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0] ?? null

  const firstItem = items[0] ?? ''
  const baseFor = (item: string): PriceDraft => {
    const cur = currentOf(item) ?? versionsOf(item).find((r) => r.status !== 'cancelled') ?? null
    return {
      item,
      unit: cur?.unit ?? 'kg',
      bagSizeKg: cur?.bagSizeKg ? String(cur.bagSizeKg) : '50',
      pricePerUnit: cur ? String(cur.pricePerUnit) : '',
      effectiveDate: addDays(today, 1),
      reason: '',
    }
  }
  const base = baseFor(draft?.item ?? firstItem)
  const d = draft ?? base
  const set = (patch: Partial<PriceDraft>) => {
    // picking another item restarts the draft from that item's price
    const next = patch.item && patch.item !== d.item ? { ...baseFor(patch.item), ...patch } : { ...d, ...patch }
    onDraft(sameDraft(next, baseFor(next.item)) ? null : next)
  }

  const price = Number(d.pricePerUnit)
  const bag = Number(d.bagSizeKg)
  const newPerKg = perKg(d.unit, price, bag)
  const versions = versionsOf(d.item)
  const before = versionBefore(versions, d.effectiveDate)
  const identical =
    !!before && before.unit === d.unit && before.pricePerUnit === price && (d.unit === 'kg' || before.bagSizeKg === bag)
  const errors = {
    item: d.item.trim() ? undefined : 'Name the item',
    pricePerUnit: d.pricePerUnit === '' || !(price >= 0) ? 'Enter the selling price' : undefined,
    bagSizeKg: d.unit === 'bag' && !(bag > 0) ? 'Enter the bag size' : undefined,
    effectiveDate:
      d.effectiveDate < today
        ? 'Pick today or a later date: approved requests keep the price they were approved at.'
        : dateTaken(versions, d.effectiveDate)
          ? 'A price for this item already starts on this date. Cancel it first (if it hasn’t started) or pick another date.'
          : undefined,
    reason: d.reason.trim().length < 3 ? 'Say why the price is changing' : undefined,
  }
  const blocked = Object.values(errors).some(Boolean) || identical
  const cost = costOf.get(d.item)?.avgCostPerKg ?? null

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <Card className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-text-heading">Selling prices</h3>
          <p className="mt-0.5 text-sm text-text-muted">
            What estate owners are charged. A request keeps the price in force on the day it was approved; a new price never
            changes an approved request. Purchase cost is the average of costed stock-ins in the last 90 days, for information.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const cur = currentOf(item)
            const next = nextOf(item)
            const c = costOf.get(item)
            const below = !!cur && c?.avgCostPerKg != null && cur.ratePerKg < c.avgCostPerKg
            const expanded = open === item
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : item)}
                  aria-expanded={expanded}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 text-left hover:bg-surface-hover sm:grid-cols-[1.2fr_1.2fr_1fr_auto]"
                >
                  <span className="flex items-center gap-2 font-medium text-text">
                    <ChevronDown className={cn('size-4 text-text-muted transition-transform', expanded && 'rotate-180')} aria-hidden />
                    {item}
                  </span>
                  <span className="tabular text-sm">
                    {cur ? (
                      <>
                        <span className="text-text">{priceLabel(cur)}</span>
                        {cur.unit === 'bag' && <span className="block text-xs text-text-muted">{formatCurrency(cur.ratePerKg)}/kg</span>}
                      </>
                    ) : (
                      <StatusBadge tone="warning">No price: can’t be approved</StatusBadge>
                    )}
                    {next && <span className="block text-xs text-text-muted">{priceLabel(next)} from {formatDate(next.effectiveDate)}</span>}
                  </span>
                  <span className="tabular hidden text-sm sm:block">
                    {c?.avgCostPerKg != null ? (
                      <span className="text-text-muted">Cost {formatCurrency(c.avgCostPerKg)}/kg</span>
                    ) : (
                      <span className="text-xs text-text-muted">No purchase cost recorded yet</span>
                    )}
                  </span>
                  <span className="justify-self-end">
                    {below && (
                      <StatusBadge tone="danger">
                        <AlertTriangle className="size-3" aria-hidden /> Selling below cost
                      </StatusBadge>
                    )}
                  </span>
                </button>
                {expanded && (
                  <table className="w-full border-t border-border bg-surface-sunken text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                        <th className="px-5 py-2 font-medium">From</th>
                        <th className="px-3 py-2 font-medium">Price</th>
                        <th className="px-3 py-2 font-medium">Reason</th>
                        <th className="px-3 py-2 font-medium">Set by</th>
                        <th className="px-5 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {versionsOf(item).map((v) => {
                        const badge = VERSION_BADGE[v.status]
                        return (
                          <tr key={v.id}>
                            <td className="whitespace-nowrap px-5 py-2">
                              <span className={cn(v.status === 'cancelled' && 'text-text-muted line-through')}>{formatDate(v.effectiveDate)}</span>{' '}
                              {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
                            </td>
                            <td className="tabular whitespace-nowrap px-3 py-2">{priceLabel(v)}</td>
                            <td className="px-3 py-2">
                              {v.reason ?? '—'}
                              {v.cancelled && (
                                <span className="block text-xs text-text-muted">
                                  Cancelled by {v.cancelled.by}: {v.cancelled.reason}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">{v.setBy}</td>
                            <td className="px-5 py-2 text-right">
                              {!readOnly && v.status === 'scheduled' && (
                                <Button size="sm" variant="ghost" onClick={() => setCancelling(v)}>
                                  Cancel
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle>New price</CardTitle>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Item"
              value={d.item}
              onChange={(e) => set({ item: e.target.value })}
              options={items.map((i) => ({ value: i, label: i }))}
              error={errors.item}
            />
            <Select
              label="Sold by"
              value={d.unit}
              onChange={(e) => set({ unit: e.target.value as 'kg' | 'bag' })}
              options={[
                { value: 'kg', label: 'The kg' },
                { value: 'bag', label: 'The bag' },
              ]}
            />
            {d.unit === 'bag' ? (
              <Input label="Bag size (kg)" type="number" min="0" step="0.01" value={d.bagSizeKg} error={errors.bagSizeKg} onChange={(e) => set({ bagSizeKg: e.target.value })} />
            ) : (
              <div className="hidden sm:block" />
            )}
            <Input
              label={d.unit === 'bag' ? 'Price per bag (Rs.)' : 'Price per kg (Rs.)'}
              type="number"
              min="0"
              step="0.01"
              value={d.pricePerUnit}
              error={errors.pricePerUnit}
              hint={d.unit === 'bag' && newPerKg > 0 ? `${formatCurrency(newPerKg)}/kg` : undefined}
              onChange={(e) => set({ pricePerUnit: e.target.value })}
            />
            <Input label="Effective date" type="date" min={today} value={d.effectiveDate} error={errors.effectiveDate} onChange={(e) => set({ effectiveDate: e.target.value })} />
            <div />
            <div className="sm:col-span-3">
              <Input label="Reason" placeholder="e.g. Supplier price increase" value={d.reason} error={draft ? errors.reason : undefined} onChange={(e) => set({ reason: e.target.value })} />
            </div>
          </div>
          {cost !== null && newPerKg > 0 && newPerKg < cost && (
            <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-danger-fg/25 bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Selling below cost: {formatCurrency(newPerKg)}/kg against an average purchase cost of {formatCurrency(cost)}/kg.
            </p>
          )}
          {identical && before && (
            <p className="mt-3 text-sm text-text-muted">The same as the price in force from {formatDate(before.effectiveDate)}, so nothing would change.</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" disabled={!draft} onClick={() => onDraft(null)}>
              Discard
            </Button>
            <Button disabled={blocked} onClick={() => setConfirming(true)}>
              Publish New Price
            </Button>
          </div>
        </Card>
      )}

      <LightConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => publish.mutate(d)}
        loading={publish.isPending}
        title={`New price for ${d.item}`}
        confirmLabel="Publish Price"
        message={
          <div className="flex flex-col gap-2">
            <p>
              From <strong>{formatDate(d.effectiveDate)}</strong>: {before ? `${priceLabel(before)} → ` : ''}
              <strong>{priceLabel({ unit: d.unit, pricePerUnit: price, bagSizeKg: bag })}</strong>
              {d.unit === 'bag' && ` (${formatCurrency(newPerKg)}/kg)`}.
            </p>
            <p>Reason: {d.reason.trim()}</p>
            <p className="text-text-muted">Requests already approved keep their price. This is recorded in the audit log.</p>
          </div>
        }
      />
      {cancelling && (
        <CancelVersionModal
          what={`${cancelling.item} price`}
          effectiveDate={cancelling.effectiveDate}
          loading={cancel.isPending}
          onClose={() => setCancelling(null)}
          onCancel={(reason) => cancel.mutate({ id: cancelling.id, reason })}
        />
      )}
    </div>
  )
}
