import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { factoryToday } from '@/features/dispatch/status'
import * as adminService from '@/services/admin'
import { CancelVersionModal } from './CancelVersionModal'
import { VERSION_BADGE, addDays, dateTaken, latestLive, sameDraft, versionBefore } from './factory-setup-model'
import type { TransportBasis, TransportRate } from './types'

/*
  ADM-01 Transport Rates (Administration-Addendum §4) — effective-dated like grade rates, so a
  change never alters a past calculation. No transport formula exists yet: until the factory
  confirms how it charges (per km or per kg) and the calculation is built, settlement processing
  shows "Transport: not configured" and stops.
*/

export interface TransportDraft {
  basis: TransportBasis
  rate: string
  minimumCharge: string
  effectiveDate: string
  basisConfirmed: boolean
  reason: string
}

const BASIS_LABEL: Record<TransportBasis, string> = { per_km: 'per km', per_kg: 'per kg' }

export function TransportRatesTab({ draft, onDraft }: { draft: TransportDraft | null; onDraft: (d: TransportDraft | null) => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const today = factoryToday()
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState<TransportRate | null>(null)
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['admin', 'transport-rates'], queryFn: adminService.getTransportRates })

  const onSaved = (rows: Awaited<ReturnType<typeof adminService.getTransportRates>>, message: string) => {
    queryClient.setQueryData(['admin', 'transport-rates'], rows)
    void queryClient.invalidateQueries({ queryKey: ['estates', 'transport-status'] })
    toast(message)
  }
  const publish = useMutation({
    mutationFn: (d: TransportDraft) =>
      adminService.createTransportRate({
        basis: d.basis,
        rate: Number(d.rate),
        minimumCharge: Number(d.minimumCharge),
        effectiveDate: d.effectiveDate,
        basisConfirmed: d.basisConfirmed,
        reason: d.reason.trim(),
      }),
    onSuccess: (rows) => {
      onSaved(rows, 'New transport-rate version published, and recorded in the audit log')
      setConfirming(false)
      onDraft(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not publish the transport rates', 'danger'),
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
  if (isError || !data) return <ErrorState title="Couldn't load transport rates" onRetry={() => void refetch()} />

  const rows = data.versions
  const latest = latestLive(rows)
  const base: TransportDraft = {
    basis: latest?.basis ?? 'per_km',
    rate: latest ? String(latest.rate) : '',
    minimumCharge: latest ? String(latest.minimumCharge) : '0',
    effectiveDate: addDays(today, 1),
    basisConfirmed: latest?.basisConfirmed ?? false,
    reason: '',
  }
  const d = draft ?? base
  const set = (patch: Partial<TransportDraft>) => {
    const next = { ...d, ...patch }
    onDraft(sameDraft(next, base) ? null : next)
  }
  const rate = Number(d.rate)
  const minimum = Number(d.minimumCharge)
  const before = versionBefore(rows, d.effectiveDate)
  const identical =
    !!before && before.basis === d.basis && before.rate === rate && before.minimumCharge === minimum && before.basisConfirmed === d.basisConfirmed
  const errors = {
    rate: d.rate === '' || !(rate >= 0) ? 'Enter the rate' : undefined,
    minimumCharge: d.minimumCharge === '' || !(minimum >= 0) ? 'Enter the minimum (0 for none)' : undefined,
    effectiveDate:
      d.effectiveDate < today
        ? 'Pick today or a later date: a past date would change what was already charged.'
        : dateTaken(rows, d.effectiveDate)
          ? 'A version already starts on this date. Cancel it first (if it hasn’t started) or pick another date.'
          : undefined,
    reason: d.reason.trim().length < 3 ? 'Say why the rates are changing' : undefined,
  }
  const blocked = Object.values(errors).some(Boolean) || identical
  const describe = (b: TransportBasis, r: number, m: number) => `${formatCurrency(r)} ${BASIS_LABEL[b]}, minimum ${formatCurrency(m)}`

  const columns: Column<TransportRate>[] = [
    {
      key: 'effectiveDate',
      header: 'Effective from',
      render: (r) => {
        const badge = VERSION_BADGE[r.status]
        return (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className={r.status === 'cancelled' ? 'text-text-muted line-through' : undefined}>{formatDate(r.effectiveDate)}</span>
            {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
          </span>
        )
      },
    },
    { key: 'rate', header: 'Rate', align: 'right', className: 'whitespace-nowrap', render: (r) => `${formatCurrency(r.rate)} ${BASIS_LABEL[r.basis]}` },
    { key: 'minimumCharge', header: 'Minimum', align: 'right', className: 'whitespace-nowrap', render: (r) => formatCurrency(r.minimumCharge) },
    {
      key: 'basisConfirmed',
      header: 'Basis',
      render: (r) => (r.basisConfirmed ? <StatusBadge tone="success">Confirmed</StatusBadge> : <StatusBadge tone="warning">Not confirmed</StatusBadge>),
    },
    {
      key: 'reason',
      header: 'Reason',
      minWidth: 220,
      render: (r) => (
        <div className="text-sm">
          <p className="text-text">{r.reason ?? '—'}</p>
          {r.cancelled && (
            <p className="text-xs text-text-muted">
              Cancelled by {r.cancelled.by} on {formatDate(r.cancelled.at.slice(0, 10))}: {r.cancelled.reason}
            </p>
          )}
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
            {data.status.reason} Settlements for estates that pay transport can’t be processed until it is; transport is never
            deducted as Rs. 0 by default.
          </span>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>New transport-rate version</CardTitle>
        </CardHeader>
        <p className="-mt-2 mb-4 text-sm text-text-muted">
          Estates with the self-delivery exemption never pay transport. A new version never changes a charge already made.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Select
            label="Charged"
            value={d.basis}
            onChange={(e) => set({ basis: e.target.value as TransportBasis })}
            options={[
              { value: 'per_km', label: 'Per km' },
              { value: 'per_kg', label: 'Per kg' },
            ]}
          />
          <Input label={`Rate (Rs. ${BASIS_LABEL[d.basis]})`} type="number" min="0" step="0.01" value={d.rate} error={errors.rate} onChange={(e) => set({ rate: e.target.value })} />
          <Input label="Minimum charge (Rs.)" type="number" min="0" step="0.01" value={d.minimumCharge} error={errors.minimumCharge} onChange={(e) => set({ minimumCharge: e.target.value })} />
          <Input label="Effective date" type="date" min={today} value={d.effectiveDate} error={errors.effectiveDate} onChange={(e) => set({ effectiveDate: e.target.value })} />
          <div className="sm:col-span-4">
            <Input label="Reason" placeholder="e.g. Fuel price change" value={d.reason} error={draft ? errors.reason : undefined} onChange={(e) => set({ reason: e.target.value })} />
          </div>
          <div className="sm:col-span-4">
            <Checkbox
              checked={d.basisConfirmed}
              onChange={(e) => set({ basisConfirmed: e.target.checked })}
              label="The factory has confirmed it charges transport this way"
            />
          </div>
        </div>
        {identical && before && (
          <p className="mt-3 text-sm text-text-muted">
            The same as the version in force from {formatDate(before.effectiveDate)}, so nothing would change.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" disabled={!draft} onClick={() => onDraft(null)}>
            Discard
          </Button>
          <Button disabled={blocked} onClick={() => setConfirming(true)}>
            Publish New Version
          </Button>
        </div>
      </Card>

      <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} />

      <LightConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => publish.mutate(d)}
        loading={publish.isPending}
        title="Publish new transport rates"
        confirmLabel="Publish Version"
        message={
          <div className="flex flex-col gap-2">
            <p>
              From <strong>{formatDate(d.effectiveDate)}</strong>: {before ? `${describe(before.basis, before.rate, before.minimumCharge)} → ` : ''}
              <strong>{describe(d.basis, rate, minimum)}</strong>
              {d.basisConfirmed ? ' (basis confirmed)' : ' (basis not confirmed)'}.
            </p>
            <p>Reason: {d.reason.trim()}</p>
            <p className="text-text-muted">Versions are never edited. This is recorded in the audit log.</p>
          </div>
        }
      />
      {cancelling && (
        <CancelVersionModal
          what="transport rates"
          effectiveDate={cancelling.effectiveDate}
          loading={cancel.isPending}
          onClose={() => setCancelling(null)}
          onCancel={(reason) => cancel.mutate({ id: cancelling.id, reason })}
        />
      )}
    </div>
  )
}
