import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, CalendarClock, Check, Info, Loader2, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as employeesService from '@/services/employees'
import { currentMonth, monthOf } from '@/lib/month'
import { ADVANCE_TONE, RECOVERY_TONE } from './advance-status'
import { defaultStartMonth, planInstallment, planLabel, planValueError, type PlanValue } from '@/features/advances/advance-plan'
import { RepaymentPlanFields } from '@/features/advances/RepaymentPlanFields'
import type { AdvanceRow, ScheduleStatus } from './types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

const SCHEDULE_TONE: Record<ScheduleStatus, BadgeTone> = { Deducted: 'success', Reserved: 'assigned', Planned: 'neutral' }

type Dialog = 'approve' | 'reject' | 'reschedule' | 'repay' | 'rejectReschedule' | null

/*
  EMP-10 detail (Salary-Advances-Addendum §10): the request and its repayment plan, the full
  schedule (Planned / Deducted / Carried forward per month), the employee's previous advances and
  outstanding balance — all server-side (advance-balance.ts / advance-schedule.ts).
  Approve (the plan may be changed, with a note) / Reject (a reason) at the top. Nobody approves
  their own advance: the server says when the viewer can't, and refuses it too.
  After approval: a reschedule (approved by someone else) or an early cash repayment.
*/
export function AdvanceDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canApprove = can('advances', 'approve')
  const canEdit = can('advances', 'edit')
  const thisMonth = currentMonth()

  const [dialog, setDialog] = useState<Dialog>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [plan, setPlan] = useState<PlanValue | null>(null)
  const [repay, setRepay] = useState({ amount: '', paidOn: '', reference: '' })
  const [rescheduleId, setRescheduleId] = useState<number | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['employees', 'advances', 'detail', id],
    queryFn: () => employeesService.getAdvance(id),
  })
  const { data: rules } = useQuery({ queryKey: ['employees', 'advances', 'rules'], queryFn: employeesService.getAdvanceRules })
  const maxMonths = rules?.maxInstallmentMonths ?? 6

  const done = (message: string, tone?: 'warning') => {
    toast(message, tone)
    setDialog(null)
    void queryClient.invalidateQueries({ queryKey: ['employees', 'advances'] })
  }
  const failed = (err: unknown) => toast(err instanceof Error ? err.message : 'Could not save this', 'danger')

  const decideMutation = useMutation({
    mutationFn: (input: employeesService.AdvanceDecision) => employeesService.decideAdvance(id, input),
    onSuccess: (updated) => {
      if (updated.status === 'Approved') done(`Approved ${formatCurrency(updated.amount)} for ${updated.employeeName} — ${planLabel(updated.plan)}`)
      else done(`Rejected advance for ${updated.employeeName}`, 'warning')
      navigate('/employees/advances')
    },
    onError: failed,
  })
  const rescheduleMutation = useMutation({
    mutationFn: (input: { installmentAmount: number; startMonth: string; note: string }) => employeesService.requestReschedule(id, input),
    onSuccess: () => done('Reschedule requested — it needs someone else’s approval'),
    onError: failed,
  })
  const decideRescheduleMutation = useMutation({
    mutationFn: (v: { rid: number; decision: 'approve' | 'reject'; reason?: string }) =>
      employeesService.decideReschedule(id, v.rid, { decision: v.decision, reason: v.reason }),
    onSuccess: (_, v) => done(v.decision === 'approve' ? 'Reschedule approved' : 'Reschedule rejected', v.decision === 'reject' ? 'warning' : undefined),
    onError: failed,
  })
  const repayMutation = useMutation({
    mutationFn: () => employeesService.recordRepayment(id, { amount: Number(repay.amount), paidOn: repay.paidOn, reference: repay.reference.trim() }),
    onSuccess: () => done(`Cash repayment of ${formatCurrency(Number(repay.amount))} recorded`),
    onError: failed,
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !data) {
    return <ErrorState title="Advance request not found" description={`No advance request with ID “${id}”.`} onRetry={() => void refetch()} />
  }

  const { advance, previous, outstanding, schedule, reschedules, cashRepayments, selfApproval } = data
  const pending = advance.status === 'Pending'
  const approved = advance.status === 'Approved'
  const pendingReschedule = reschedules.find((r) => r.status === 'Pending')
  const requestedPlan: PlanValue = {
    mode: advance.plan.months > 1 ? 'installments' : 'single',
    installment: String(advance.plan.installment),
    months: String(advance.plan.months),
    startMonth: (advance.plan.startPeriod && monthOf(advance.plan.startPeriod)) || defaultStartMonth(thisMonth),
  }
  const editing = plan ?? requestedPlan
  const planChanged =
    planInstallment(advance.amount, editing) !== advance.plan.installment || editing.startMonth !== requestedPlan.startMonth
  const planProblem = planValueError(advance.amount, editing, maxMonths)

  const open = (d: Dialog) => {
    setReason('')
    setNote('')
    setPlan(d === 'reschedule' ? { ...requestedPlan, mode: 'installments', startMonth: defaultStartMonth(thisMonth) } : null)
    setRepay({ amount: '', paidOn: new Date().toISOString().slice(0, 10), reference: '' })
    setDialog(d)
  }

  return (
    <div>
      <PageHeader
        title={`Advance ${advance.id}`}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Salary Advances', to: '/employees/advances' },
          { label: advance.id },
        ]}
        description={`${advance.employeeName} · ${advance.role}`}
        actions={
          pending && canApprove ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {selfApproval.blocked && <span className="text-xs text-danger-fg">{selfApproval.reason}</span>}
              <Button variant="secondary" onClick={() => open('reject')}>
                <X className="size-4" /> Reject
              </Button>
              <Button onClick={() => open('approve')} disabled={selfApproval.blocked} title={selfApproval.reason ?? undefined}>
                <Check className="size-4" /> Approve
              </Button>
            </div>
          ) : approved && canEdit && advance.remaining > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => open('repay')}>
                <Banknote className="size-4" /> Record cash repayment
              </Button>
              <Button variant="secondary" onClick={() => open('reschedule')} disabled={!!pendingReschedule}>
                <CalendarClock className="size-4" /> Reschedule
              </Button>
            </div>
          ) : undefined
        }
      />

      {pending && canApprove && !selfApproval.identityChecked && (
        <p className="mb-4 flex items-start gap-1.5 text-xs text-text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          The identity check couldn't run — a NIC is missing on your login or the employee's record — so only "you requested it"
          was checked.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
              <StatusBadge tone={ADVANCE_TONE[advance.status]}>{advance.status}</StatusBadge>
            </CardHeader>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Employee" value={<Link to={`/employees/${advance.employeeId}`} className="text-primary hover:underline">{advance.employeeName}</Link>} />
              <Field label="Reference" value={<span className="id">{advance.id}</span>} />
              <Field label="Amount" value={<span className="tabular">{formatCurrency(advance.amount)}</span>} />
              <Field label="Date requested" value={formatDate(advance.dateRequested)} />
              <Field
                label={pending ? 'Requested plan' : 'Repayment plan'}
                value={
                  <span>
                    {planLabel(advance.plan)}
                    {advance.plan.startPeriod && <span className="text-text-muted"> from {advance.plan.startPeriod}</span>}
                    {advance.clearedPeriod && <span className="text-text-muted"> · cleared {advance.clearedPeriod}</span>}
                  </span>
                }
              />
              <Field label="Reason" value={advance.reason} />
              {advance.requestedBy && <Field label="Requested by" value={advance.requestedBy} />}
              {advance.planChangeNote && <Field label="Plan changed at approval" value={`“${advance.planChangeNote}”`} />}
            </dl>
          </Card>

          {schedule.length > 0 && (
            <Card className="p-0">
              <CardHeader className="px-5 pt-4">
                <CardTitle>Schedule</CardTitle>
                {advance.recovery && <StatusBadge tone={RECOVERY_TONE[advance.recovery]}>{advance.recovery}</StatusBadge>}
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken text-[11px] uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-5 py-2 text-left">Payroll month</th>
                      <th className="px-5 py-2 text-right">Planned</th>
                      <th className="px-5 py-2 text-right">Deducted</th>
                      <th className="px-5 py-2 text-right">Carried forward</th>
                      <th className="px-5 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((m) => (
                      <tr key={m.period} className="border-t border-border">
                        <td className="px-5 py-2">{m.period}</td>
                        <td className="tabular px-5 py-2 text-right">{formatCurrency(m.planned)}</td>
                        <td className="tabular px-5 py-2 text-right">{m.status === 'Planned' ? '—' : formatCurrency(m.deducted)}</td>
                        <td className={`tabular px-5 py-2 text-right ${m.carried > 0 ? 'text-warning-fg' : ''}`}>
                          {m.carried > 0 ? formatCurrency(m.carried) : '—'}
                        </td>
                        <td className="px-5 py-2">
                          <StatusBadge tone={SCHEDULE_TONE[m.status]}>{m.status}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-5 py-2 text-xs text-text-muted">
                Each month deducts one installment at most — less if the gross can't cover it (up to {rules?.advanceDeductionCapPct ?? 50}% of
                gross); what's left moves to the end of the schedule.
                {cashRepayments.length > 0 &&
                  ` Cash repaid: ${cashRepayments.map((c) => `${formatCurrency(c.amount)} on ${c.paidOn ? formatDate(c.paidOn) : '—'} (${c.reference})`).join(', ')}.`}
              </p>
            </Card>
          )}

          {reschedules.length > 0 && (
            <Card className="p-0">
              <CardHeader className="px-5 pt-4">
                <CardTitle>Reschedules</CardTitle>
              </CardHeader>
              <ul className="divide-y divide-border text-sm">
                {reschedules.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div>
                      <p className="text-text">
                        {formatCurrency(r.installmentAmount)} a month from {r.startPeriod}
                        <span className="text-text-muted"> — “{r.note}”</span>
                      </p>
                      <p className="text-xs text-text-muted">
                        Requested by {r.requestedBy ?? '—'} on {formatDate(r.requestedOn)}
                        {r.decidedBy && ` · ${r.status} by ${r.decidedBy}${r.decisionReason ? `: ${r.decisionReason}` : ''}`}
                      </p>
                    </div>
                    {r.status === 'Pending' && canApprove ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={decideRescheduleMutation.isPending}
                          onClick={() => {
                            open('rejectReschedule')
                            setRescheduleId(r.id)
                          }}
                        >
                          Reject
                        </Button>
                        <Button size="sm" loading={decideRescheduleMutation.isPending} onClick={() => decideRescheduleMutation.mutate({ rid: r.id, decision: 'approve' })}>
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <StatusBadge tone={r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'danger' : 'warning'}>{r.status}</StatusBadge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <PreviousAdvances advance={advance} previous={previous} />
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle className="mb-1">Outstanding balance</CardTitle>
            <p className="tabular text-2xl font-semibold text-text-heading">{formatCurrency(outstanding)}</p>
            <p className="mt-1 text-xs text-text-muted">
              Approved advances still to be recovered through payroll
              {pending && outstanding > 0 ? ' — approving adds this request on top.' : '.'}
            </p>
            {approved && (
              <dl className="tabular mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                <dt className="text-text-muted">This advance: recovered</dt>
                <dd className="text-right">{formatCurrency(advance.recovered)}</dd>
                <dt className="text-text-muted">Remaining</dt>
                <dd className="text-right font-medium">{formatCurrency(advance.remaining)}</dd>
                {advance.nextPeriod && (
                  <>
                    <dt className="text-text-muted">Next deduction</dt>
                    <dd className="text-right">{advance.nextPeriod}</dd>
                  </>
                )}
              </dl>
            )}
          </Card>
          <Card>
            <CardTitle className="mb-3">Decision</CardTitle>
            {advance.decidedBy ? (
              <div className="text-sm">
                <p className="text-text">
                  {advance.status} by <span className="font-medium">{advance.decidedBy}</span>
                </p>
                {advance.decidedOn && <p className="text-xs text-text-muted">{formatDateTime(advance.decidedOn)}</p>}
                {advance.decisionReason && <p className="mt-2 text-text">“{advance.decisionReason}”</p>}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Awaiting a decision.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Approve — the plan as requested, or changed (with a note) */}
      <LightConfirmModal
        open={dialog === 'approve'}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          decideMutation.mutate(
            planChanged
              ? {
                  decision: 'approve',
                  installmentAmount: planInstallment(advance.amount, editing),
                  startMonth: editing.startMonth,
                  note: note.trim(),
                }
              : { decision: 'approve' },
          )
        }
        loading={decideMutation.isPending}
        confirmDisabled={!!planProblem || (planChanged && !note.trim())}
        title="Approve advance"
        confirmLabel={planChanged ? 'Approve changed plan' : 'Approve'}
        message={
          <>
            Approve <strong>{formatCurrency(advance.amount)}</strong> for {advance.employeeName}
            {outstanding > 0 ? `, on top of ${formatCurrency(outstanding)} already outstanding` : ''}? Approve the plan as requested, or change
            it — a change needs a note.
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <RepaymentPlanFields amount={advance.amount} value={editing} onChange={setPlan} maxMonths={maxMonths} firstMonth={thisMonth} />
          {planChanged && <Input label="Why the plan changed (required)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />}
        </div>
      </LightConfirmModal>

      <LightConfirmModal
        open={dialog === 'reject'}
        onClose={() => setDialog(null)}
        onConfirm={() => decideMutation.mutate({ decision: 'reject', reason: reason.trim() })}
        loading={decideMutation.isPending}
        confirmDisabled={!reason.trim()}
        tone="danger"
        title="Reject advance"
        confirmLabel="Reject"
        message={<>Reject the advance request for {advance.employeeName}? The reason is recorded with the decision.</>}
      >
        <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
      </LightConfirmModal>

      {/* Reschedule — a new installment / start month; processed months are never changed */}
      <LightConfirmModal
        open={dialog === 'reschedule'}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          rescheduleMutation.mutate({
            installmentAmount: planInstallment(advance.remaining, editing),
            startMonth: editing.startMonth,
            note: note.trim(),
          })
        }
        loading={rescheduleMutation.isPending}
        confirmDisabled={!!planValueError(advance.remaining, editing, maxMonths) || !note.trim()}
        title="Reschedule the remaining balance"
        confirmLabel="Request reschedule"
        message={
          <>
            Spread the remaining <strong>{formatCurrency(advance.remaining)}</strong> differently. Months already processed stay as they
            are. Someone other than you must approve the change.
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <RepaymentPlanFields
            amount={advance.remaining}
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

      {/* Early repayment in cash */}
      <LightConfirmModal
        open={dialog === 'repay'}
        onClose={() => setDialog(null)}
        onConfirm={() => repayMutation.mutate()}
        loading={repayMutation.isPending}
        confirmDisabled={!(Number(repay.amount) > 0) || Number(repay.amount) > advance.remaining || !repay.paidOn || !repay.reference.trim()}
        title="Record cash repayment"
        confirmLabel="Record repayment"
        message={
          <>
            Cash repaid by {advance.employeeName} towards {advance.id}. It reduces the remaining {formatCurrency(advance.remaining)} and
            shortens the schedule.
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Amount (Rs.)" type="number" min="1" value={repay.amount} onChange={(e) => setRepay({ ...repay, amount: e.target.value })} autoFocus />
          <Input label="Date paid" type="date" value={repay.paidOn} onChange={(e) => setRepay({ ...repay, paidOn: e.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Receipt / reference" value={repay.reference} onChange={(e) => setRepay({ ...repay, reference: e.target.value })} maxLength={100} />
          </div>
        </div>
      </LightConfirmModal>
    </div>
  )
}

function PreviousAdvances({ advance, previous }: { advance: AdvanceRow; previous: AdvanceRow[] }) {
  return (
    <Card className="p-0">
      <CardHeader className="px-5 pt-4">
        <CardTitle>Previous advances</CardTitle>
      </CardHeader>
      {previous.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-text-muted">This is {advance.employeeName}'s first advance request.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {previous.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
              <Link to={`/employees/advances/${p.id}`} className="id text-primary hover:underline">
                {p.id}
              </Link>
              <span className="text-text-muted">{formatDate(p.dateRequested)}</span>
              <StatusBadge tone={ADVANCE_TONE[p.status]}>{p.status}</StatusBadge>
              {p.recovery && <StatusBadge tone={RECOVERY_TONE[p.recovery]}>{p.recovery}</StatusBadge>}
              <span className="tabular">{formatCurrency(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-text">{value}</dd>
    </div>
  )
}

