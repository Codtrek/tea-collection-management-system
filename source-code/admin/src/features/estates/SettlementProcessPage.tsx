import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Info, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/data/ErrorState'
import { HighStakesConfirmFlow } from '@/components/patterns/HighStakesConfirmFlow'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as estatesService from '@/services/estates'
import { grossRevenue, netPayable } from './calc'
import { formatCurrency, formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'

/*
  EST-08 — 2nd use of HighStakesConfirmFlow. Same expandable-breakdown pattern
  as Payroll Processing; missing-bank estates are excluded and flagged, not
  blocked (UC-054). No per-transaction bank charge is deducted here — resolved
  2026-07-26: the factory is billed a separate periodic platform fee instead
  (see Claude.md's Payment calculation section).
*/
export function SettlementProcessPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const {
    data: settlements,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ['estates', 'settlements'], queryFn: estatesService.listSettlements })

  const pending = (settlements ?? []).filter((s) => s.status === 'Pending')
  const included = pending.filter((s) => !s.missingBank)
  const excluded = pending.filter((s) => s.missingBank)
  const total = included.reduce((sum, s) => sum + netPayable(s), 0)

  const processMutation = useMutation({
    mutationFn: () => estatesService.processSettlements(),
    onSuccess: (processed) => {
      const processedTotal = processed.reduce((sum, s) => sum + netPayable(s), 0)
      toast(`Settlement processed by ${user?.name} — ${formatCurrency(processedTotal)} across ${processed.length} estates`)
      void queryClient.invalidateQueries({ queryKey: ['estates', 'settlements'] })
      void queryClient.invalidateQueries({ queryKey: ['estates', 'advances'] })
      navigate('/estates/settlements')
    },
    onError: (err) => {
      setConfirming(false)
      toast(err instanceof Error ? err.message : 'Could not process this settlement run', 'danger')
    },
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Couldn't load settlements" description="Something went wrong fetching payment settlements." onRetry={() => void refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="Process Payment Settlement"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Estate Owners', to: '/estates' },
          { label: 'Settlements', to: '/estates/settlements' },
          { label: 'Process' },
        ]}
      />

      {/* Settlement period header */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Settlement period" value="July 2026" />
        <SummaryTile label="Estates" value={`${included.length} included`} />
        <SummaryTile label="Total payable" value={formatCurrency(total)} highlight />
      </div>

      {excluded.length > 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-danger-fg/20 bg-danger-bg/60 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-fg" />
          <p className="text-sm text-text">
            <span className="font-medium text-danger-fg">
              {excluded.length} estate{excluded.length > 1 ? 's' : ''} excluded
            </span>{' '}
            — missing bank details: {excluded.map((s) => s.estateName).join(', ')}. Add bank details to include them in
            this run.
          </p>
        </div>
      )}

      {/* Estate breakdown — expandable calculation rows */}
      <Card className="p-0">
        <div className="divide-y divide-border">
          {included.map((s) => {
            const open = expanded === s.id
            return (
              <div key={s.id}>
                <button
                  onClick={() => setExpanded(open ? null : s.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-hover"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown className={cn('size-4 text-text-muted transition-transform', open && 'rotate-180')} />
                    <span className="text-sm font-medium text-text">{s.estateName}</span>
                    {s.selfDelivery && <span className="text-xs text-text-muted">(self-delivery)</span>}
                  </span>
                  <span className="tabular text-sm font-medium text-text">{formatCurrency(netPayable(s))}</span>
                </button>
                {open && (
                  <dl className="flex flex-col gap-1.5 bg-surface-sunken px-11 py-3 text-sm">
                    <Row
                      label={`Gross revenue — Super ${formatWeight(s.superKg)} × ${formatCurrency(s.superRate)}/kg`}
                      value={formatCurrency(s.superKg * s.superRate)}
                    />
                    <Row
                      label={`Gross revenue — Normal ${formatWeight(s.normalKg)} × ${formatCurrency(s.normalRate)}/kg`}
                      value={formatCurrency(s.normalKg * s.normalRate)}
                    />
                    <Row label="Gross revenue" value={formatCurrency(grossRevenue(s))} strong />
                    <Row
                      label={s.selfDelivery ? 'Less: Transport cost (exempt — self-delivery)' : 'Less: Transport cost'}
                      value={s.selfDelivery ? '—' : `- ${formatCurrency(s.transportCost)}`}
                    />
                    <Row
                      label="Less: Fertilizer deduction (linked dispatches)"
                      value={s.fertilizerDeduction ? `- ${formatCurrency(s.fertilizerDeduction)}` : '—'}
                    />
                    <Row
                      label="Less: Advance payments"
                      value={s.advanceDeduction ? `- ${formatCurrency(s.advanceDeduction)}` : '—'}
                    />
                    <div className="mt-1 border-t border-border pt-1.5">
                      <Row label="Net payable" value={formatCurrency(netPayable(s))} strong />
                    </div>
                  </dl>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Bank charge — resolved 2026-07-26: never deducted from estate owners. */}
      <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-text-muted" />
        <p className="text-sm text-text-muted">
          No per-transaction bank charge is deducted from estate owners in this run — the factory is billed a
          separate periodic fee instead.
        </p>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/estates/settlements')}>
          Cancel
        </Button>
        <Button size="lg" onClick={() => setConfirming(true)}>
          Process {included.length} Settlements
        </Button>
      </div>

      <HighStakesConfirmFlow
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => processMutation.mutate()}
        loading={processMutation.isPending}
        title="Confirm settlement run"
        amount={total}
        confirmLabel="Process Settlement"
        review={
          <div className="rounded-[var(--radius-md)] border border-border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Estates included</span>
              <span className="tabular font-medium text-text">{included.length}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-text-muted">Excluded (missing bank)</span>
              <span className="tabular font-medium text-danger-fg">{excluded.length}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-medium text-text">Total payable</span>
              <span className="tabular font-semibold text-text-heading">{formatCurrency(total)}</span>
            </div>
            <p className="mt-2 text-xs text-text-muted">Generates the bank-ready payment file. This cannot be undone.</p>
          </div>
        }
      />
    </div>
  )
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-1)]', highlight && 'ring-1 ring-primary/20')}>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className={cn('tabular mt-1 text-lg font-semibold', highlight ? 'text-primary' : 'text-text-heading')}>{value}</p>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={cn(strong ? 'font-medium text-text' : 'text-text-muted')}>{label}</dt>
      <dd className={cn('tabular shrink-0', strong ? 'font-semibold text-text-heading' : 'text-text')}>{value}</dd>
    </div>
  )
}
