import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Calculator, ChevronDown, Info, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { HighStakesConfirmFlow } from '@/components/patterns/HighStakesConfirmFlow'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as estatesService from '@/services/estates'
import { currentMonth, readMonth, shiftMonth } from '@/lib/month'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { SettlementCalculationView } from './SettlementCalculationView'
import { RunConfirmSummary, RunTotalsList } from './SettlementRunSummary'
import { ratePeriodsText } from './settlement-run'
import type { NotEligibleDelivery, RunRow } from './settlement-run-types'

/*
  EST-08 — Process the month's settlements (Settlement-Addendum). One row per estate, expandable
  into the generator's whole calculation; warnings at the top say who is excluded and why; the
  totals row and the confirm popup both read the run's totals, which are what the backend
  processes. The officer re-types the total net payable; if the figures moved since the page
  loaded, the backend refuses and nothing is processed. No per-transaction bank charge is
  deducted (resolved 2026-07-26 — the factory is billed a separate periodic fee).
*/
export function SettlementProcessPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, can } = useAuth()
  const queryClient = useQueryClient()
  // Edit prepares and recalculates drafts; Approve processes (the server checks the same keys)
  const canPrepare = can('estateOwners', 'edit')
  const canProcess = can('estateOwners', 'approve')
  // excluding an ungraded delivery is the Manager's call (grading approval)
  const canExclude = can('gradingApproval', 'approve')
  const [confirming, setConfirming] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [excluding, setExcluding] = useState<NotEligibleDelivery | null>(null)
  const [searchParams] = useSearchParams()
  const thisMonth = currentMonth()
  const month = readMonth(searchParams.get('month'), thisMonth, shiftMonth(thisMonth, -1))
  const backHref = `/estates/settlements?month=${month}`

  const { data: run, isPending, isError, refetch } = useQuery({
    queryKey: ['estates', 'settlements', 'run', month],
    queryFn: () => estatesService.getSettlementRun(month),
  })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['estates', 'settlements'] })

  const prepare = useMutation({
    mutationFn: () => estatesService.prepareSettlements(month),
    onSuccess: () => {
      toast('Drafts recalculated from the current figures')
      refresh()
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not prepare settlements', 'danger'),
  })

  const processMutation = useMutation({
    mutationFn: () => estatesService.processSettlements(month, run!.totals.net),
    onSuccess: ({ processed, totals }) => {
      toast(`Settlement processed by ${user?.name} — ${formatCurrency(totals.net)} across ${processed.length} estates`)
      refresh()
      void queryClient.invalidateQueries({ queryKey: ['estates', 'advances'] })
      navigate(backHref)
    },
    onError: (err) => {
      setConfirming(false)
      refresh()
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
    return <ErrorState title="Couldn't load settlements" description="Something went wrong fetching the settlement run." onRetry={() => void refetch()} />
  }

  const ready = run.rows.filter((r) => r.ready)
  const notReady = run.rows.filter((r) => !r.ready)
  const changed = run.rows.filter((r) => r.changedSincePrepared).length
  const notPrepared = run.rows.filter((r) => !r.settlementId).length
  const transportBlocked = run.rows.some((r) => r.calc.transport.status === 'not_configured')

  return (
    <div>
      <PageHeader
        title="Process Payment Settlement"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Estate Owners', to: '/estates' },
          { label: 'Settlements', to: backHref },
          { label: 'Process' },
        ]}
        description={`${run.period} · ${ratePeriodsText(run.ratePeriods)}`}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Settlement period" value={run.period} />
        <SummaryTile label="Estates" value={`${ready.length} included · ${notReady.length} excluded`} />
        <SummaryTile label="Total net payable" value={formatCurrency(run.totals.net)} highlight={run.totals.net > 0} />
      </div>

      {/* warnings first: who is left out of this run, and why */}
      <div className="mb-4 flex flex-col gap-2">
        {transportBlocked && (
          <Warning tone="warning">
            <span className="font-medium">{run.transport.reason}</span> Estates that pay transport can’t be processed
            until a monthly charge covers {run.period} — transport is never deducted as Rs. 0.
          </Warning>
        )}
        {changed > 0 && canPrepare && (
          <Warning tone="warning">
            {changed} draft{changed === 1 ? '' : 's'} changed since prepared (rates, charges or deliveries). The figures
            below are current; processing uses them.{' '}
            <Button size="sm" variant="secondary" onClick={() => prepare.mutate()} loading={prepare.isPending}>
              <Calculator className="size-3.5" /> Recalculate drafts
            </Button>
          </Warning>
        )}
        {notPrepared > 0 && (
          <Warning tone="warning">
            {notPrepared} estate{notPrepared === 1 ? ' has' : 's have'} payable deliveries but no draft yet.{' '}
            {canPrepare && (
              <Button size="sm" variant="secondary" onClick={() => prepare.mutate()} loading={prepare.isPending}>
                <Calculator className="size-3.5" /> Prepare them
              </Button>
            )}
          </Warning>
        )}
        {notReady.length > 0 && (
          <Warning tone="danger">
            <span className="font-medium text-danger-fg">
              {notReady.length} estate{notReady.length === 1 ? '' : 's'} excluded from this run
            </span>
            <ul className="mt-1 list-disc pl-5">
              {groupReasons(notReady).map(([reason, names]) => (
                <li key={reason}>
                  {reason} — {names.length > 4 ? `${names.slice(0, 4).join(', ')} and ${names.length - 4} more` : names.join(', ')}
                </li>
              ))}
            </ul>
          </Warning>
        )}
        {run.legacy.length > 0 && (
          <Warning tone="neutral">
            {run.legacy.length} Legacy (seed) settlement{run.legacy.length === 1 ? '' : 's'} for {run.period} (
            {run.legacy.map((l) => l.estateName).join(', ')}) stay read-only and are never processed.
          </Warning>
        )}
      </div>

      <Card className="p-0">
        <div className="divide-y divide-border">
          {[...ready, ...notReady].map((r) => (
            <EstateRow
              key={r.estateId}
              row={r}
              open={expanded === r.estateId}
              onToggle={() => setExpanded(expanded === r.estateId ? null : r.estateId)}
              onExclude={canExclude ? setExcluding : undefined}
            />
          ))}
          {run.rows.length === 0 && (
            <p className="px-4 py-6 text-sm text-text-muted">No estate has payable deliveries in {run.period}.</p>
          )}
        </div>
        <div className="border-t-2 border-border bg-surface-sunken px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Totals · {ready.length} estate{ready.length === 1 ? '' : 's'} in this run
          </p>
          <RunTotalsList totals={run.totals} />
        </div>
      </Card>

      <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-text-muted" />
        <p className="text-sm text-text-muted">
          No per-transaction bank charge is deducted from estate owners in this run — the factory is billed a separate
          periodic fee instead.
        </p>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(backHref)}>
          Cancel
        </Button>
        {canProcess && (
          <Button size="lg" onClick={() => setConfirming(true)} disabled={ready.length === 0}>
            Process {ready.length} Settlement{ready.length === 1 ? '' : 's'}
          </Button>
        )}
      </div>

      <HighStakesConfirmFlow
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => processMutation.mutate()}
        loading={processMutation.isPending}
        title={`Process ${run.period} settlements`}
        amount={run.totals.net}
        confirmLabel="Process Settlements"
        review={<RunConfirmSummary run={run} />}
      />

      <ExcludeDeliveryModal
        delivery={excluding}
        month={month}
        onClose={() => setExcluding(null)}
        onDone={() => {
          setExcluding(null)
          refresh()
        }}
      />
    </div>
  )
}

function groupReasons(rows: RunRow[]): [string, string[]][] {
  const by = new Map<string, string[]>()
  for (const r of rows) {
    const reason = r.settlementId ? (r.reasons[0] ?? 'Not ready') : 'Not prepared yet'
    // one bucket per kind of reason, not per delivery id
    const key = reason
      .replace(/\s*\(.*?\)/g, '')
      .replace(/^\d+ deliver(y is|ies are)/, 'Deliveries are')
      .replace(/Grade (it|them), or exclude (it|them)/, 'Grade or exclude them')
    by.set(key, [...(by.get(key) ?? []), r.estateName])
  }
  return [...by.entries()]
}

function EstateRow({
  row,
  open,
  onToggle,
  onExclude,
}: {
  row: RunRow
  open: boolean
  onToggle: () => void
  onExclude?: (d: NotEligibleDelivery) => void
}) {
  const c = row.calc
  return (
    <div className={cn(!row.ready && 'bg-surface-sunken/40')}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-hover"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <ChevronDown className={cn('size-4 shrink-0 text-text-muted transition-transform', open && 'rotate-180')} />
          <span className="text-sm font-medium text-text">{row.estateName}</span>
          {row.settlementId && <span className="id text-xs text-text-muted">{row.settlementId}</span>}
          {c.selfDelivery && <span className="text-xs text-text-muted">(self-delivery)</span>}
          {!row.ready && (
            <StatusBadge tone={row.settlementId ? 'danger' : 'neutral'}>
              {row.settlementId ? 'Excluded' : 'Not prepared'}
            </StatusBadge>
          )}
          {row.changedSincePrepared && <StatusBadge tone="warning">Changed</StatusBadge>}
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className={cn('tabular text-sm font-medium', row.ready ? 'text-text' : 'text-text-muted')}>
            {formatCurrency(c.net)}
          </span>
          <span className="tabular text-xs text-text-muted">gross {formatCurrency(c.gross)}</span>
        </span>
      </button>
      {!row.ready && row.reasons.length > 0 && (
        <ul className="px-11 pb-2 text-xs text-danger-fg">
          {row.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {open && (
        <div className="bg-surface-sunken px-11 py-4">
          <SettlementCalculationView calc={c} />
          {onExclude && c.ungraded.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {c.ungraded.map((d) => (
                <Button key={d.id} size="sm" variant="secondary" onClick={() => onExclude(d)}>
                  Exclude {d.id} ({formatDate(d.date)})
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** A Manager leaves an ungraded delivery out of the month, with a reason; it rolls to the next month. */
function ExcludeDeliveryModal({
  delivery,
  month,
  onClose,
  onDone,
}: {
  delivery: NotEligibleDelivery | null
  month: string
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useToast()
  const [reason, setReason] = useState('')
  const exclude = useMutation({
    mutationFn: () => estatesService.excludeDelivery(delivery!.id, month, reason.trim()),
    onSuccess: () => {
      toast(`${delivery!.id} excluded — it rolls to the next month`)
      setReason('')
      onDone()
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not exclude the delivery', 'danger'),
  })
  const valid = reason.trim().length >= 5
  return (
    <Modal
      open={delivery !== null}
      onClose={onClose}
      title={`Exclude ${delivery?.id ?? ''} from this month`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={exclude.isPending}>
            Cancel
          </Button>
          <Button onClick={() => exclude.mutate()} disabled={!valid} loading={exclude.isPending}>
            Exclude delivery
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-text-muted">
        The delivery isn’t graded yet. Excluding it lets this estate be processed now; the delivery is paid in the
        next month the estate is settled for, at the rate of its own date.
      </p>
      <Input
        label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Grading delayed — scale fault at intake"
        error={reason && !valid ? 'At least 5 characters' : undefined}
      />
      <p className="mt-2 text-xs text-text-muted">
        <Link to={`/collections/${delivery?.id ?? ''}`} className="text-primary hover:underline">
          Open the delivery
        </Link>{' '}
        to grade it instead.
      </p>
    </Modal>
  )
}

function Warning({ tone, children }: { tone: 'warning' | 'danger' | 'neutral'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--radius-md)] border p-4 text-sm',
        tone === 'warning' && 'border-warning-fg/25 bg-warning-bg text-warning-fg',
        tone === 'danger' && 'border-danger-fg/20 bg-danger-bg/60 text-text',
        tone === 'neutral' && 'border-border bg-surface text-text-muted',
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
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
