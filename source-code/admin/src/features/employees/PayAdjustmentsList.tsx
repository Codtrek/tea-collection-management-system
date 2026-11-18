import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { HighStakesConfirmFlow } from '@/components/patterns/HighStakesConfirmFlow'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate } from '@/lib/format'
import * as employeesService from '@/services/employees'
import type { PayAdjustment } from './types'

/*
  Pay changes (Administration-Addendum §8): pending ones first. The Administrator approves (through
  HighStakesConfirmFlow, re-typing the monthly cost change) or rejects with a reason. Nobody
  decides their own change or one that includes them — the server enforces it and says why here.
*/

const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'neutral' } as const
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatCurrency(Math.abs(n))}`
const scopeLabel = (a: PayAdjustment) =>
  a.scope === 'all' ? 'All employees' : a.scope === 'role' ? `Role: ${a.role}` : `${a.lines.length} selected employee${a.lines.length === 1 ? '' : 's'}`

export function PayAdjustmentsList() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState<number | null>(null)
  const [approving, setApproving] = useState<PayAdjustment | null>(null)
  const [rejecting, setRejecting] = useState<PayAdjustment | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['employees', 'pay-adjustments'], queryFn: employeesService.listPayAdjustments })
  // `?changes=decide` (the Dashboard's "pay changes awaiting approval"): only the ones you can decide
  const [searchParams, setSearchParams] = useSearchParams()
  const onlyToDecide = searchParams.get('changes') === 'decide'
  const clearToDecide = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('changes')
    setSearchParams(next, { replace: true })
  }

  const decide = useMutation({
    mutationFn: ({ id, decision, reason }: { id: number; decision: 'approve' | 'reject'; reason?: string }) =>
      employeesService.decidePayChange(id, decision, reason),
    onSuccess: (a) => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast(a.status === 'approved' ? `Pay change #${a.id} approved: the new rates apply from ${formatDate(a.effectiveDate)}` : `Pay change #${a.id} rejected`)
      setApproving(null)
      setRejecting(null)
      setRejectReason('')
    },
    onError: (err) => {
      setApproving(null)
      toast(err instanceof ApiError ? err.message : 'Could not decide the pay change', 'danger')
    },
  })

  if (isPending) return <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
  if (isError || !data) return <ErrorState title="Couldn't load pay changes" onRetry={() => void refetch()} />
  if (data.length === 0) return null

  const shown = onlyToDecide ? data.filter((a) => a.status === 'pending' && a.approval.canDecide) : data
  const sorted = [...shown].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'))
  return (
    <Card className="p-0">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-text-heading">Pay changes</h3>
        <p className="mt-0.5 text-sm text-text-muted">Prepared by the Factory Manager, approved by an Administrator. Nothing applies before approval.</p>
        {onlyToDecide && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge tone="neutral">Awaiting your approval</StatusBadge>
            <span className="tabular text-text-muted">· {shown.length} shown</span>
            <Button size="sm" variant="ghost" onClick={clearToDecide}>
              Show all
            </Button>
          </p>
        )}
      </div>
      <ul className="divide-y divide-border">
        {sorted.map((a) => {
          const expanded = open === a.id
          return (
            <li key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <button type="button" onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded} className="flex min-w-0 items-start gap-2 text-left">
                  <ChevronDown className={cn('mt-0.5 size-4 shrink-0 text-text-muted transition-transform', expanded && 'rotate-180')} aria-hidden />
                  <span className="text-sm">
                    <span className="font-medium text-text">
                      #{a.id} · {a.changeLabel} · {scopeLabel(a)}
                    </span>
                    <span className="block text-xs text-text-muted">
                      From {formatDate(a.effectiveDate)} · {signed(a.totalMonthlyChange)} a month · prepared by {a.requestedBy} on{' '}
                      {formatDate(a.requestedAt.slice(0, 10))} · “{a.reason}”
                    </span>
                    {a.decidedBy && (
                      <span className="block text-xs text-text-muted">
                        {a.status === 'approved' ? 'Approved' : 'Rejected'} by {a.decidedBy}
                        {a.decisionReason && `: “${a.decisionReason}”`}
                      </span>
                    )}
                  </span>
                </button>
                <span className="flex items-center gap-2">
                  <StatusBadge tone={STATUS_TONE[a.status]}>{a.status === 'pending' ? 'Awaiting approval' : a.status === 'approved' ? 'Approved' : 'Rejected'}</StatusBadge>
                  {a.status === 'pending' && a.approval.canDecide && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setRejecting(a)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => setApproving(a)}>
                        Approve
                      </Button>
                    </>
                  )}
                </span>
              </div>
              {a.status === 'pending' && a.approval.blockedReason && (
                <p className="px-11 pb-3 text-xs text-text-muted">{a.approval.blockedReason}</p>
              )}
              {expanded && <Lines a={a} />}
            </li>
          )
        })}
      </ul>

      {approving && (
        <HighStakesConfirmFlow
          open
          onClose={() => setApproving(null)}
          onConfirm={() => decide.mutate({ id: approving.id, decision: 'approve' })}
          loading={decide.isPending}
          title={`Approve pay change #${approving.id}`}
          confirmLabel="Approve pay change"
          amount={Math.abs(approving.totalMonthlyChange)}
          review={
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <strong>{approving.changeLabel}</strong> for {scopeLabel(approving).toLowerCase()} from{' '}
                <strong>{formatDate(approving.effectiveDate)}</strong>: {signed(approving.totalMonthlyChange)} a month.
              </p>
              <p>Prepared by {approving.requestedBy}: “{approving.reason}”</p>
              {approving.decreaseAgreement && <p>The preparer confirmed the employees’ written agreement to the decrease.</p>}
              <p className="text-text-muted">The new rates go into the pay history; payroll already processed never changes. Recorded in the audit log.</p>
            </div>
          }
        />
      )}
      <LightConfirmModal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        onConfirm={() => rejecting && decide.mutate({ id: rejecting.id, decision: 'reject', reason: rejectReason.trim() })}
        loading={decide.isPending}
        confirmDisabled={rejectReason.trim().length < 3}
        title={`Reject pay change #${rejecting?.id ?? ''}`}
        confirmLabel="Reject"
        message="The change won’t apply. The reason is shown to the person who prepared it and kept in the audit log."
      >
        <div className="mt-3">
          <Input label="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </div>
      </LightConfirmModal>
    </Card>
  )
}

function Lines({ a }: { a: PayAdjustment }) {
  return (
    <div className="overflow-x-auto border-t border-border bg-surface-sunken">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-5 py-2 font-medium">Employee</th>
            <th className="px-3 py-2 text-right font-medium">Day rate</th>
            <th className="px-3 py-2 text-right font-medium">Day OT</th>
            <th className="px-3 py-2 text-right font-medium">Night</th>
            <th className="px-3 py-2 text-right font-medium">Night OT</th>
            <th className="px-5 py-2 text-right font-medium">Per month</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {a.lines.map((l) => (
            <tr key={l.employeeId}>
              <td className="px-5 py-2">
                {l.name} <span className="text-xs text-text-muted">· {l.onOverride ? 'own rate' : 'role rate'}</span>
              </td>
              {(['dayRate', 'dayOtRate', 'nightRate', 'nightOtRate'] as const).map((k) => (
                <td key={k} className="tabular whitespace-nowrap px-3 py-2 text-right">
                  {formatCurrency(l.old[k])} → {formatCurrency(l.new[k])}
                </td>
              ))}
              <td className="tabular whitespace-nowrap px-5 py-2 text-right">{signed(l.monthlyChange)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
