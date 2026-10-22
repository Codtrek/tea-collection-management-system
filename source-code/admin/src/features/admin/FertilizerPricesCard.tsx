import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { factoryToday } from '@/features/dispatch/status'
import * as fertilizerService from '@/services/fertilizer'
import { formatCurrency, formatDate } from '@/lib/format'

/*
  Fertilizer prices (Fertilizer-Delivery-Addendum §2) — effective-dated Rs./kg per item, set by
  the Administrator. A request snapshots the price in force on the day it's approved, so a new
  version here never changes an approved request; past versions are never edited.
*/
export function FertilizerPricesCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const today = factoryToday()
  const prices = useQuery({ queryKey: ['fertilizer', 'prices'], queryFn: fertilizerService.listPrices })
  const batches = useQuery({ queryKey: ['fertilizer', 'batches'], queryFn: fertilizerService.listBatches })

  const [adding, setAdding] = useState(false)
  const [item, setItem] = useState('')
  const [rate, setRate] = useState('')
  const [from, setFrom] = useState(today)

  const save = useMutation({
    mutationFn: () => fertilizerService.setPrice({ item, ratePerKg: Number(rate), effectiveDate: from }),
    onSuccess: (rows) => {
      queryClient.setQueryData(['fertilizer', 'prices'], rows)
      toast(`${item}: ${formatCurrency(Number(rate))}/kg from ${formatDate(from)}`)
      setAdding(false)
      setRate('')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not set the price', 'danger'),
  })

  const items = [...new Set([...(batches.data ?? []).map((b) => b.item), ...(prices.data ?? []).map((p) => p.item)])].sort()
  const current = (prices.data ?? []).filter((p) => p.current)
  const unpriced = items.filter((i) => !current.some((p) => p.item === i))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fertilizer prices</CardTitle>
        {!adding && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Set a new price
          </Button>
        )}
      </CardHeader>

      {prices.isPending ? (
        <Loader2 className="size-5 animate-spin text-text-muted" aria-hidden />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((i) => {
            const versions = (prices.data ?? []).filter((p) => p.item === i)
            const now = versions.find((p) => p.current)
            const next = versions.find((p) => p.effectiveDate > today)
            return (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-text">{i}</span>
                <span className="text-right">
                  {now ? (
                    <span className="tabular font-medium text-text">{formatCurrency(now.ratePerKg)}/kg</span>
                  ) : (
                    <StatusBadge tone="warning">No price — can’t be approved</StatusBadge>
                  )}
                  {next && (
                    <span className="block text-xs text-text-muted">
                      {formatCurrency(next.ratePerKg)}/kg from {formatDate(next.effectiveDate)}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {adding && (
        <div className="mt-4 grid gap-3 rounded-[var(--radius-md)] border border-border p-3 sm:grid-cols-3">
          <Select
            label="Item"
            placeholder="Select item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            options={items.map((i) => ({ value: i, label: i }))}
          />
          <Input label="Rs. per kg" type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Input label="From" type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} />
          <div className="flex gap-2 sm:col-span-3">
            <Button size="sm" disabled={!item || rate === '' || Number(rate) < 0 || !from} loading={save.isPending} onClick={() => save.mutate()}>
              Save price
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-text-muted">
        A request keeps the price in force on the day it was approved — a new price never changes it.
        {unpriced.length > 0 && ` ${unpriced.length} item${unpriced.length > 1 ? 's have' : ' has'} no price yet.`}
      </p>
    </Card>
  )
}
