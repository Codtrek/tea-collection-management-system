import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/data/ErrorState'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as employeesService from '@/services/employees'
import { ADVANCE_TONE, RECOVERY_TONE } from './advance-status'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

/*
  EMP-10 detail (Salary-Advances-Addendum): the request, the employee's previous advances and
  their outstanding balance (server-side, advance-balance.ts — the figure payroll deducts from).
  Approve / Reject at the top, confirmed in a LightConfirmModal; rejecting needs a reason, which
  goes into the audit log with the decision.
*/
export function AdvanceDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const canApprove = can('advances', 'approve')

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['employees', 'advances', 'detail', id],
    queryFn: () => employeesService.getAdvance(id),
  })

  const decideMutation = useMutation({
    mutationFn: (d: 'approve' | 'reject') => employeesService.decideAdvance(id, d, reason.trim() || undefined),
    onSuccess: (updated) => {
      if (updated.status === 'Approved') {
        toast(`Approved advance of ${formatCurrency(updated.amount)} for ${updated.employeeName}`)
      } else {
        toast(`Rejected advance for ${updated.employeeName}`, 'warning')
      }
      setDecision(null)
      void queryClient.invalidateQueries({ queryKey: ['employees', 'advances'] })
      navigate('/employees/advances')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not record this decision', 'danger'),
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

  const { advance, previous, outstanding } = data
  const pending = advance.status === 'Pending'
  const ask = (d: 'approve' | 'reject') => {
    setReason('')
    setDecision(d)
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
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => ask('reject')}>
                <X className="size-4" /> Reject
              </Button>
              <Button onClick={() => ask('approve')}>
                <Check className="size-4" /> Approve
              </Button>
            </div>
          ) : undefined
        }
      />

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
              <Field label="Reason" value={advance.reason} />
              {advance.recovery && (
                <Field
                  label="Recovery"
                  value={
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={RECOVERY_TONE[advance.recovery]}>{advance.recovery}</StatusBadge>
                      {(advance.recoveredPeriod ?? advance.payrollPeriod) && (
                        <span className="text-xs text-text-muted">{advance.recoveredPeriod ?? advance.payrollPeriod} payroll</span>
                      )}
                    </span>
                  }
                />
              )}
            </dl>
          </Card>

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
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle className="mb-1">Outstanding balance</CardTitle>
            <p className="tabular text-2xl font-semibold text-text-heading">{formatCurrency(outstanding)}</p>
            <p className="mt-1 text-xs text-text-muted">
              Approved advances still to be recovered through payroll
              {pending && outstanding > 0 ? ' — approving adds this request on top.' : '.'}
            </p>
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

      <LightConfirmModal
        open={!!decision}
        onClose={() => setDecision(null)}
        onConfirm={() => decision && decideMutation.mutate(decision)}
        loading={decideMutation.isPending}
        confirmDisabled={decision === 'reject' && !reason.trim()}
        tone={decision === 'reject' ? 'danger' : 'default'}
        title={decision === 'approve' ? 'Approve advance' : 'Reject advance'}
        confirmLabel={decision === 'approve' ? 'Approve' : 'Reject'}
        message={
          decision === 'approve' ? (
            <>
              Approve <strong>{formatCurrency(advance.amount)}</strong> for {advance.employeeName}? It is recovered in full from their
              next payroll run{outstanding > 0 ? `, on top of ${formatCurrency(outstanding)} already outstanding` : ''}.
            </>
          ) : (
            <>Reject the advance request for {advance.employeeName}? The reason is recorded with the decision.</>
          )
        }
      >
        {decision === 'reject' && (
          <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
        )}
      </LightConfirmModal>
    </div>
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
