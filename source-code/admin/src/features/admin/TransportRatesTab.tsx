import { useDeferredValue, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import * as adminService from '@/services/admin'
import { CancelVersionModal } from './CancelVersionModal'
import { VERSION_BADGE, latestLive, monthName, sameDraft, transportMonthOptions } from './factory-setup-model'
import type { TransportRate } from './types'

/*
  ADM-01 Transport (Administration-Addendum §4) — one versioned "monthly transport charge per
  estate", the same for every estate. An estate is charged once for a settlement month in which
  it delivered at least once; no deliveries = no charge; self-delivery estates are exempt. A
  version charges from the month it names; a new one never changes a processed settlement.
*/

export interface TransportDraft {
  amount: string
  /** 'YYYY-MM' */
  effectiveMonth: string
  reason: string
}

export function TransportRatesTab({ draft, onDraft }: { draft: TransportDraft | null; onDraft: (d: TransportDraft | null) => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState<TransportRate | null>(null)
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['admin', 'transport-rates'], queryFn: adminService.getTransportRates })

  const amountText = draft?.amount ?? ''
  const deferredAmount = useDeferredValue(amountText)
  const previewAmount = Number(deferredAmount)
  const preview = useQuery({
    queryKey: ['admin', 'transport-rates', 'preview', previewAmount],
    queryFn: () => adminService.previewTransportCharge(previewAmount),
    enabled: deferredAmount !== '' && previewAmount >= 0,
    placeholderData: keepPreviousData,
  })

  const onSaved = (rows: Awaited<ReturnType<typeof adminService.getTransportRates>>, message: string) => {
    queryClient.setQueryData(['admin', 'transport-rates'], rows)
    void queryClient.invalidateQueries({ queryKey: ['estates'] })
    toast(message)
  }
  const publish = useMutation({
    mutationFn: (d: TransportDraft) =>
      adminService.createTransportRate({ amount: Number(d.amount), effectiveMonth: d.effectiveMonth, reason: d.reason.trim() }),
    onSuccess: (rows) => {
      onSaved(rows, 'New monthly transport charge published, and recorded in the audit log')
      setConfirming(false)
      onDraft(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not publish the transport charge', 'danger'),
  })
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => adminService.cancelTransportRate(id, reason),
    onSuccess: (rows) => {
      onSaved(rows, 'Scheduled version cancelled, and recorded in the audit log')
      setCancelling(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not cancel the version', 'danger'),
  })

  if (isPending) return <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
  if (isError || !data) return <ErrorState title="Couldn't load the transport charge" onRetry={() => void refetch()} />

  const rows = data.versions
  const monthly = rows.filter((r) => r.basis === 'fixed_month')
  const months = transportMonthOptions(data.nextMonth, data.firstVersionFrom)
  const base: TransportDraft = { amount: '', effectiveMonth: data.firstVersionFrom ?? data.nextMonth, reason: '' }
  const d = draft ?? base
  const set = (patch: Partial<TransportDraft>) => {
    const next = { ...d, ...patch }
    onDraft(sameDraft(next, base) ? null : next)
  }
  const amount = Number(d.amount)
  const effectiveDate = `${d.effectiveMonth}-01`
  const before =
    monthly
      .filter((r) => r.status !== 'cancelled' && r.effectiveDate < effectiveDate)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null
  const identical = !!before && before.rate === amount
  const backdated = d.effectiveMonth < data.nextMonth
  const errors = {
    amount: d.amount === '' || !(amount >= 0) ? 'Enter the monthly charge per estate' : undefined,
    effectiveMonth: monthly.some((r) => r.status !== 'cancelled' && r.firstMonth === d.effectiveMonth)
      ? 'A version already starts this month. Cancel it first (if it hasn’t started) or pick another month.'
      : undefined,
    reason: d.reason.trim().length < 3 ? 'Say why the charge is being set' : undefined,
  }
  const blocked = Object.values(errors).some(Boolean) || identical
  const latest = latestLive(monthly)

  const columns: Column<TransportRate>[] = [
    {
      key: 'effectiveDate',
      header: 'Charges from',
      render: (r) => {
        const badge = r.neverApplied ? { label: 'Never applied', tone: 'neutral' as const } : VERSION_BADGE[r.status]
        return (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className={r.status === 'cancelled' ? 'text-text-muted line-through' : undefined}>
              {r.basis === 'fixed_month' ? monthName(r.firstMonth) : formatDate(r.effectiveDate)}
            </span>
            {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
          </span>
        )
      },
    },
    {
      key: 'rate',
      header: 'Charge',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (r) =>
        r.basis === 'fixed_month' ? (
          `${formatCurrency(r.rate)} per estate per month`
        ) : (
          <span className="text-text-muted">
            {formatCurrency(r.rate)} {r.basis === 'per_km' ? 'per km' : 'per kg'}, minimum {formatCurrency(r.minimumCharge)}
          </span>
        ),
    },
    {
      key: 'reason',
      header: 'Reason',
      minWidth: 220,
      render: (r) => (
        <div className="text-sm">
          <p className="text-text">{r.reason ?? '—'}</p>
          {r.backdated && <p className="text-xs text-text-muted">First version, back-dated to settle the months already waiting.</p>}
          {r.cancelled && !r.neverApplied && (
            <p className="text-xs text-text-muted">
              Cancelled by {r.cancelled.by} on {formatDate(r.cancelled.at.slice(0, 10))}: {r.cancelled.reason}
            </p>
          )}
          {r.neverApplied && <p className="text-xs text-text-muted">{r.cancelled?.reason ?? 'Never charged.'}</p>}
        </div>
      ),
    },
    { key: 'setBy', header: 'Set by' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) =>
        r.status === 'scheduled' ? (
          <Button size="sm" variant="ghost" onClick={() => setCancelling(r)}>
            Cancel
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {!data.status.configured && (
        <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {data.status.reason} Settlements for estates that pay transport can’t be processed for a month no charge covers;
            transport is never deducted as Rs. 0 by default.
          </span>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{latest ? 'New monthly transport charge' : 'Set the monthly transport charge'}</CardTitle>
        </CardHeader>
        <p className="-mt-2 mb-4 text-sm text-text-muted">
          The same amount for every estate, charged once for each settlement month in which the estate delivered at least once. No
          deliveries means no charge; self-delivery estates are exempt. A new version never changes a processed settlement.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Monthly transport charge per estate (Rs.)"
            type="number"
            min="0"
            step="0.01"
            value={d.amount}
            error={draft ? errors.amount : undefined}
            onChange={(e) => set({ amount: e.target.value })}
          />
          <Select
            label="Charges from"
            value={d.effectiveMonth}
            error={errors.effectiveMonth}
            onChange={(e) => set({ effectiveMonth: e.target.value })}
            options={months.map((m) => ({ value: m, label: m < data.nextMonth ? `${monthName(m)} (past month)` : monthName(m) }))}
          />
          <div className="sm:col-span-2">
            <Input
              label="Reason"
              placeholder="e.g. Agreed with the estate owners at the October meeting"
              value={d.reason}
              error={draft ? errors.reason : undefined}
              onChange={(e) => set({ reason: e.target.value })}
            />
          </div>
        </div>
        {data.firstVersionFrom && (
          <p className="mt-3 text-sm text-text-muted">
            The first charge may start in a past month, back to {monthName(data.firstVersionFrom)} (the earliest month with settlements
            still to process). Only the first: every later version starts {monthName(data.nextMonth)} or later.
          </p>
        )}
        {preview.data && d.amount !== '' && !errors.amount && (
          <p className="mt-3 text-sm text-text" aria-live="polite">
            Last month ({monthName(preview.data.month)}) this would have charged{' '}
            <strong className="tabular-nums">
              {formatNumber(preview.data.estates)} estate{preview.data.estates === 1 ? '' : 's'}
            </strong>
            , total <strong className="tabular-nums">{formatCurrency(preview.data.total)}</strong>
            {preview.data.exempt > 0 && <span className="text-text-muted"> ({formatNumber(preview.data.exempt)} self-delivery estate{preview.data.exempt === 1 ? '' : 's'} exempt)</span>}.
          </p>
        )}
        {identical && before && (
          <p className="mt-3 text-sm text-text-muted">The same as the charge from {monthName(before.firstMonth)}, so nothing would change.</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" disabled={!draft} onClick={() => onDraft(null)}>
            Discard
          </Button>
          <Button disabled={blocked} onClick={() => setConfirming(true)}>
            Publish Charge
          </Button>
        </div>
      </Card>

      <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} />

      <LightConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => publish.mutate(d)}
        loading={publish.isPending}
        title="Publish the monthly transport charge"
        confirmLabel="Publish Charge"
        message={
          <div className="flex flex-col gap-2">
            <p>
              From <strong>{monthName(d.effectiveMonth)}</strong>: {before ? `${formatCurrency(before.rate)} → ` : ''}
              <strong>{formatCurrency(amount)}</strong> per estate per month.
            </p>
            {backdated && (
              <p>
                This is the first charge and starts in a past month: pending settlements from {monthName(d.effectiveMonth)} will carry it.
                Processed settlements never change.
              </p>
            )}
            <p>Reason: {d.reason.trim()}</p>
            <p className="text-text-muted">Versions are never edited. This is recorded in the audit log.</p>
          </div>
        }
      />
      {cancelling && (
        <CancelVersionModal
          what="transport charge"
          effectiveDate={cancelling.effectiveDate}
          loading={cancel.isPending}
          onClose={() => setCancelling(null)}
          onCancel={(reason) => cancel.mutate({ id: cancelling.id, reason })}
        />
      )}
    </div>
  )
}
