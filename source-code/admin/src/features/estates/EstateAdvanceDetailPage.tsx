import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, CalendarClock, History, Loader2, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState } from '@/components/data/ErrorState'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { currentMonth } from '@/lib/month'
import * as estatesService from '@/services/estates'
import { defaultStartMonth, monthsForInstallment, planInstallment, planLabel, planValueError, type PlanValue } from '@/features/advances/advance-plan'
import { RepaymentPlanFields } from '@/features/advances/RepaymentPlanFields'
import { ReschedulesList } from '@/features/advances/ReschedulesList'
import { ScheduleTable } from '@/features/advances/ScheduleTable'
import { ESTATE_RECOVERY_TONE } from './estate-advance-filters'
import { formatCurrency, formatDate } from '@/lib/format'

type Dialog = 'reschedule' | 'repay' | 'rejectReschedule' | null

/*
  EST-05 detail (Estate-Owner-Advances-Addendum §3–4): one estate advance — who it went to, why,
  its repayment plan and the full schedule (Planned / Deducted / Carried forward per settlement
  period, each linked to its settlement). After issue: a reschedule (approved by someone else —
  the server refuses a self-approval) or an early repayment in cash / by bank transfer.
  Everything is computed server-side by the shared installment model.
*/
export function EstateAdvanceDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = can('estateAdvances', 'edit')
  const canApprove = can('estateAdvances', 'approve')
  const thisMonth = currentMonth()

  const [dialog, setDialog] = useState<Dialog>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [plan, setPlan] = useState<PlanValue | null>(null)
  const [repay, setRepay] = useState({ kind: 'cash' as 'cash' | 'bank', amount: '', paidOn: '', reference: '' })
  const [rescheduleId, setRescheduleId] = useState<number | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['estates', 'advances', 'detail', id],
    queryFn: () => estatesService.getAdvance(id),
  })
  const estateId = data?.advance.estateId ?? ''
  const { data: context } = useQuery({
    queryKey: ['estates', 'advance-context', estateId],
    queryFn: () => estatesService.getAdvanceContext(estateId),
    enabled: !!estateId,
  })
  const maxMonths = context?.maxInstallmentMonths ?? 6

  const done = (message: string, tone?: 'warning') => {
    toast(message, tone)
    setDialog(null)
    void queryClient.invalidateQueries({ queryKey: ['estates'] })
  }
  const failed = (err: unknown) => toast(err instanceof Error ? err.message : 'Could not save this', 'danger')

  const rescheduleMutation = useMutation({
    mutationFn: (input: { installmentAmount: number; startMonth: string; note: string }) => estatesService.requestAdvanceReschedule(id, input),
    onSuccess: () => done('Reschedule requested — it needs someone else’s approval'),
    onError: failed,
  })
  const decideRescheduleMutation = useMutation({
    mutationFn: (v: { rid: number; decision: 'approve' | 'reject'; reason?: string }) =>
      estatesService.decideAdvanceReschedule(id, v.rid, { decision: v.decision, reason: v.reason }),
    onSuccess: (_, v) => done(v.decision === 'approve' ? 'Reschedule approved' : 'Reschedule rejected', v.decision === 'reject' ? 'warning' : undefined),
    onError: failed,
  })
  const repayMutation = useMutation({
    mutationFn: () =>
      estatesService.recordAdvanceRepayment(id, {
        kind: repay.kind,
        amount: Number(repay.amount),
        paidOn: repay.paidOn,
        reference: repay.reference.trim(),
      }),
    onSuccess: () => done(`${repay.kind === 'bank' ? 'Bank' : 'Cash'} repayment of ${formatCurrency(Number(repay.amount))} recorded`),
    onError: failed,
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Couldn't load this advance" description="It may not exist." onRetry={() => void refetch()} />
  }

  const { advance: a, schedule, repayments, reschedules } = data
  const open = a.remaining > 0
  const pendingReschedule = reschedules.find((r) => r.status === 'Pending')
  const currentInstallment = Math.min(a.plan.installment, a.remaining)
  const current: PlanValue = {
    mode: 'installments',
    installment: String(currentInstallment),
    months: currentInstallment > 0 ? String(monthsForInstallment(a.remaining, currentInstallment)) : '',
    startMonth: defaultStartMonth(thisMonth),
  }
  const editing = plan ?? current
  const openDialog = (d: Dialog) => {
    setReason('')
    setNote('')
    setPlan(null)
    setRepay({ kind: 'cash', amount: '', paidOn: new Date().toISOString().slice(0, 10), reference: '' })
    setDialog(d)
  }
  const fact = (label: string, value: ReactNode) => (
    <div className="flex justify-between gap-4 border-t border-border py-2 text-sm first:border-t-0">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text">{value}</span>
    </div>
  )

  return (
    <div>
      <PageHeader
        title={`${a.estateName} — ${formatCurrency(a.amount)}`}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Estate Owner Advances', to: '/estates/advances' },
          { label: a.id },
        ]}
        description={`${a.ownerName} · ${a.route || 'No route'}`}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {open && canEdit && (
              <>
                <Button variant="secondary" onClick={() => openDialog('repay')}>
                  <Banknote className="size-4" /> Record repayment
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openDialog('reschedule')}
                  disabled={!!pendingReschedule}
                  title={pendingReschedule ? 'A reschedule is already waiting for approval' : undefined}
                >
                  <CalendarClock className="size-4" /> Reschedule
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => navigate(`/estates/${a.estateId}?tab=timeline`)}>
              <History className="size-4" /> Owner's full history
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge tone={ESTATE_RECOVERY_TONE[a.recovery]}>{a.recovery}</StatusBadge>
        {a.estateInactive && (
          <StatusBadge tone="danger" icon={<TriangleAlert className="size-3.5" />}>
            Outstanding: estate inactive
          </StatusBadge>
        )}
        <span className="text-xs text-text-muted">
          issued by {a.issuedBy} on {formatDate(a.dateIssued)}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Card className="p-0">
            <CardHeader className="px-5 pt-4">
              <CardTitle>Deduction schedule</CardTitle>
            </CardHeader>
            {schedule.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-text-muted">No settlement period is on record for this advance.</p>
            ) : (
              <ScheduleTable
                rows={schedule}
                periodHeader="Settlement period"
                extra={{
                  header: 'Settlement',
                  render: (m) =>
                    m.settlementId ? (
                      <Link to={`/estates/settlements/${m.settlementId}`} className="id text-primary hover:underline">
                        {m.settlementId}
                      </Link>
                    ) : (
                      <span className="text-xs text-text-muted">not generated yet</span>
                    ),
                }}
              />
            )}
            <p className="border-t border-border px-5 py-2 text-xs text-text-muted">
              Each settlement deducts one installment at most — less if its money runs out after transport and fertilizer (and never more
              than {context?.deductionCapPct ?? 50}% of gross); what's left moves to the end of the schedule. Net payable never goes below Rs. 0.
              {repayments.length > 0 &&
                ` Repaid early: ${repayments
                  .map((r) => `${formatCurrency(r.amount)} by ${r.kind} on ${r.paidOn ? formatDate(r.paidOn) : '—'} (${r.reference ?? '—'})`)
                  .join(', ')}.`}
            </p>
          </Card>

          {reschedules.length > 0 && (
            <Card className="p-0">
              <CardHeader className="px-5 pt-4">
                <CardTitle>Reschedules</CardTitle>
              </CardHeader>
              <ReschedulesList
                reschedules={reschedules}
                per="a period"
                canDecide={canApprove}
                busy={decideRescheduleMutation.isPending}
                onApprove={(rid) => decideRescheduleMutation.mutate({ rid, decision: 'approve' })}
                onReject={(rid) => {
                  openDialog('rejectReschedule')
                  setRescheduleId(rid)
                }}
              />
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Advance</CardTitle>
          </CardHeader>
          {fact('Reference', <span className="id">{a.id}</span>)}
          {fact(
            'Estate',
            <Link to={`/estates/${a.estateId}`} className="text-primary hover:underline">
              {a.estateName}
            </Link>,
          )}
          {fact('Owner', a.ownerName)}
          {fact('Reason', a.reason)}
          {fact(
            'Repayment plan',
            <span>
              {planLabel(a.plan)}
              <span className="block text-xs text-text-muted">
                from {a.plan.startPeriod}
                {a.clearedPeriod && ` · cleared ${a.clearedPeriod}`}
              </span>
            </span>,
          )}
          {fact('Amount', <span className="tabular">{formatCurrency(a.amount)}</span>)}
          {fact('Recovered', <span className="tabular">{formatCurrency(a.recovered)}</span>)}
          {a.carriedForward > 0 && fact('Carried forward so far', <span className="tabular text-warning-fg">{formatCurrency(a.carriedForward)}</span>)}
          {fact('Remaining', <span className="tabular font-semibold text-text-heading">{formatCurrency(a.remaining)}</span>)}
          {a.nextPeriod && fact('Next deduction', a.nextPeriod)}
        </Card>
      </div>

      {/* Reschedule — a new installment / start period; processed periods are never changed */}
      <LightConfirmModal
        open={dialog === 'reschedule'}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          rescheduleMutation.mutate({
            installmentAmount: planInstallment(a.remaining, editing),
            startMonth: editing.startMonth,
            note: note.trim(),
          })
        }
        loading={rescheduleMutation.isPending}
        confirmDisabled={!!planValueError(a.remaining, editing, maxMonths) || !note.trim()}
        title="Reschedule the remaining balance"
        confirmLabel="Request reschedule"
        message={
          <>
            Spread the remaining <strong>{formatCurrency(a.remaining)}</strong> differently. Settlement periods already processed stay as
            they are. Someone other than you must approve the change.
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <RepaymentPlanFields
            amount={a.remaining}
            value={editing}
            onChange={setPlan}
            maxMonths={maxMonths}
            firstMonth={defaultStartMonth(thisMonth)}
            installmentsOnly
          />
          <Input label="Reason (required)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
      </LightConfirmModal>

      <LightConfirmModal
        open={dialog === 'rejectReschedule'}
        onClose={() => setDialog(null)}
        onConfirm={() => rescheduleId !== null && decideRescheduleMutation.mutate({ rid: rescheduleId, decision: 'reject', reason: reason.trim() })}
        loading={decideRescheduleMutation.isPending}
        confirmDisabled={!reason.trim()}
        tone="danger"
        title="Reject reschedule"
        confirmLabel="Reject"
        message={<>The current plan stays as it is.</>}
      >
        <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
      </LightConfirmModal>

      {/* Early repayment — cash or bank transfer */}
      <LightConfirmModal
        open={dialog === 'repay'}
        onClose={() => setDialog(null)}
        onConfirm={() => repayMutation.mutate()}
        loading={repayMutation.isPending}
        confirmDisabled={!(Number(repay.amount) > 0) || Number(repay.amount) > a.remaining || !repay.paidOn || !repay.reference.trim()}
        title="Record repayment"
        confirmLabel="Record repayment"
        message={
          <>
            Repaid by {a.ownerName} towards {a.id}. It reduces the remaining {formatCurrency(a.remaining)} and shortens the schedule.
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Paid by"
            value={repay.kind}
            onChange={(e) => setRepay({ ...repay, kind: e.target.value as 'cash' | 'bank' })}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'bank', label: 'Bank transfer' },
            ]}
          />
          <Input label="Amount (Rs.)" type="number" min="1" value={repay.amount} onChange={(e) => setRepay({ ...repay, amount: e.target.value })} autoFocus />
          <Input label="Date paid" type="date" value={repay.paidOn} onChange={(e) => setRepay({ ...repay, paidOn: e.target.value })} />
          <Input
            label={repay.kind === 'bank' ? 'Bank reference' : 'Receipt number'}
            value={repay.reference}
            onChange={(e) => setRepay({ ...repay, reference: e.target.value })}
            maxLength={100}
          />
        </div>
      </LightConfirmModal>
    </div>
  )
}
