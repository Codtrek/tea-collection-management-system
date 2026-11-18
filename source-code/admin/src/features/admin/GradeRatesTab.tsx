import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
import type { GradeRate } from './types'

/*
  ADM-01 Grade Rates (Grade-Rates-Addendum, Administration-Addendum §3). Leaf is valued at the
  version in force on its DELIVERY date, so a new version never re-prices leaf already delivered —
  except that a version starting today also prices deliveries already recorded today (warned).
  Every version needs a reason; a scheduled one can be cancelled before it starts.
*/

export interface GradeDraft {
  superRate: string
  normalRate: string
  effectiveDate: string
  reason: string
}

export function GradeRatesTab({ draft, onDraft }: { draft: GradeDraft | null; onDraft: (d: GradeDraft | null) => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const today = factoryToday()
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState<GradeRate | null>(null)
  const { data: rates, isPending, isError, refetch } = useQuery({ queryKey: ['admin', 'grade-rates'], queryFn: adminService.getGradeRates })

  const publish = useMutation({
    mutationFn: (d: GradeDraft) =>
      adminService.createGradeRate({
        superRate: Number(d.superRate),
        normalRate: Number(d.normalRate),
        effectiveDate: d.effectiveDate,
        reason: d.reason.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'grade-rates'] })
      toast('New grade-rate version published, and recorded in the audit log')
      setConfirming(false)
      onDraft(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not publish the rate version', 'danger'),
  })
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminService.cancelGradeRate(id, reason),
    onSuccess: (rows) => {
      queryClient.setQueryData(['admin', 'grade-rates'], rows)
      toast('Scheduled version cancelled, and recorded in the audit log')
      setCancelling(null)
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not cancel the version', 'danger'),
  })

  if (isPending) return <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
  if (isError || !rates) return <ErrorState title="Couldn't load grade rates" onRetry={() => void refetch()} />

  const latest = latestLive(rates)
  const base: GradeDraft = {
    superRate: latest ? String(latest.superRate) : '',
    normalRate: latest ? String(latest.normalRate) : '',
    // tomorrow by default: a version starting today also prices today's deliveries already recorded
    effectiveDate: addDays(today, 1),
    reason: '',
  }
  const d = draft ?? base
  const set = (patch: Partial<GradeDraft>) => {
    const next = { ...d, ...patch }
    onDraft(sameDraft(next, base) ? null : next)
  }
  const sup = Number(d.superRate)
  const nor = Number(d.normalRate)
  const before = versionBefore(rates, d.effectiveDate)
  const identical = !!before && before.superRate === sup && before.normalRate === nor
  const errors = {
    superRate: !(sup > 0) ? 'Enter a rate above Rs. 0' : undefined,
    normalRate: !(nor > 0) ? 'Enter a rate above Rs. 0' : undefined,
    effectiveDate:
      d.effectiveDate < today
        ? 'Pick today or a later date: a past date would change the value of leaf already delivered.'
        : dateTaken(rates, d.effectiveDate)
          ? 'A version already starts on this date. Cancel it first (if it hasn’t started) or pick another date.'
          : undefined,
    reason: d.reason.trim().length < 3 ? 'Say why the rates are changing' : undefined,
  }
  const blocked = Object.values(errors).some(Boolean) || identical

  const columns: Column<GradeRate>[] = [
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
    { key: 'superRate', header: 'Super (Rs./kg)', align: 'right', render: (r) => formatCurrency(r.superRate) },
    { key: 'normalRate', header: 'Normal (Rs./kg)', align: 'right', render: (r) => formatCurrency(r.normalRate) },
    {
      key: 'reason',
      header: 'Reason',
      minWidth: 220,
      render: (r) => (
        <div className="text-sm">
          <p className="text-text">{r.reason ?? <span className="text-text-muted">—</span>}</p>
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
      <Card>
        <CardHeader>
          <CardTitle>New rate version</CardTitle>
        </CardHeader>
        <p className="-mt-2 mb-4 text-sm text-text-muted">
          Leaf is valued at the rates in force on its delivery date. A new version never changes leaf delivered before it starts.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Super grade (Rs./kg)" type="number" min="0" step="0.01" value={d.superRate} error={errors.superRate} onChange={(e) => set({ superRate: e.target.value })} />
          <Input label="Normal grade (Rs./kg)" type="number" min="0" step="0.01" value={d.normalRate} error={errors.normalRate} onChange={(e) => set({ normalRate: e.target.value })} />
          <Input label="Effective date" type="date" min={today} value={d.effectiveDate} error={errors.effectiveDate} onChange={(e) => set({ effectiveDate: e.target.value })} />
          <div className="sm:col-span-3">
            <Input label="Reason" placeholder="e.g. Tea Board price revision, November" value={d.reason} error={draft ? errors.reason : undefined} onChange={(e) => set({ reason: e.target.value })} />
          </div>
        </div>
        {d.effectiveDate === today && (
          <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Starting today: deliveries already recorded today will also be valued at the new rates, because rates apply by
            delivery date. Pick tomorrow to leave today’s deliveries on the current rates.
          </p>
        )}
        {identical && before && (
          <p className="mt-3 text-sm text-text-muted">
            These are the same rates as the version in force from {formatDate(before.effectiveDate)}, so nothing would change.
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

      <DataTable columns={columns} rows={rates} rowKey={(r) => r.id} />

      <LightConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => publish.mutate(d)}
        loading={publish.isPending}
        title="Publish new grade rates"
        confirmLabel="Publish Version"
        message={
          <div className="flex flex-col gap-2">
            <p>
              From <strong>{formatDate(d.effectiveDate)}</strong>
              {d.effectiveDate === today && ' (today: deliveries already recorded today are re-valued too)'}:
            </p>
            <ul className="tabular list-disc pl-5">
              <li>
                Super {before ? `${formatCurrency(before.superRate)} → ` : ''}
                <strong>{formatCurrency(sup)}/kg</strong>
              </li>
              <li>
                Normal {before ? `${formatCurrency(before.normalRate)} → ` : ''}
                <strong>{formatCurrency(nor)}/kg</strong>
              </li>
            </ul>
            <p>Reason: {d.reason.trim()}</p>
            <p className="text-text-muted">Versions are never edited. This is recorded in the audit log.</p>
          </div>
        }
      />
      {cancelling && (
        <CancelVersionModal
          what="grade rates"
          effectiveDate={cancelling.effectiveDate}
          loading={cancel.isPending}
          onClose={() => setCancelling(null)}
          onCancel={(reason) => cancel.mutate({ id: cancelling.id, reason })}
        />
      )}
    </div>
  )
}
