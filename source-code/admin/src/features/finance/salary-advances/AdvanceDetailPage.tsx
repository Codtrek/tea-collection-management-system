import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { ADVANCES } from './data'
import type { AdvanceStatus } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

const tone: Record<AdvanceStatus, BadgeTone> = { Pending: 'warning', Approved: 'success', Rejected: 'danger' }

export function AdvanceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const advance = ADVANCES.find((a) => a.id === id) ?? ADVANCES[0]
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const canApprove = can('advances', 'approve')

  return (
    <div>
      <PageHeader
        title="Advance Request"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Salary Advances', to: '/employees/advances' }, { label: advance.id }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request Summary</CardTitle>
            <StatusBadge tone={tone[advance.status]}>{advance.status}</StatusBadge>
          </CardHeader>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Employee" value={advance.employeeName} />
            <Field label="Reference" value={<span className="id">{advance.id}</span>} />
            <Field label="Amount" value={<span className="tabular text-lg font-semibold text-text-heading">{formatCurrency(advance.amount)}</span>} />
            <Field label="Date requested" value={formatDate(advance.dateRequested)} />
            <div className="sm:col-span-2"><Field label="Reason" value={advance.reason} /></div>
          </dl>

          {advance.status === 'Pending' && canApprove && (
            <div className="mt-6 flex gap-2 border-t border-border pt-4">
              <Button onClick={() => setDecision('approve')}><Check className="size-4" /> Approve</Button>
              <Button variant="danger" onClick={() => setDecision('reject')}><X className="size-4" /> Reject</Button>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Decision History</CardTitle></CardHeader>
          {advance.decidedBy ? (
            <div className="flex gap-3 text-sm">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
              <span className="text-text">
                {advance.status} by <span className="font-medium">{advance.decidedBy}</span>
                <span className="mt-0.5 block text-xs text-text-muted">{advance.decidedOn && formatDate(advance.decidedOn)}</span>
              </span>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Awaiting a decision.</p>
          )}
        </Card>
      </div>

      {/* EMP-10 Approval */}
      <LightConfirmModal
        open={!!decision}
        onClose={() => setDecision(null)}
        onConfirm={() => {
          if (decision === 'approve') {
            toast(`Approved advance of ${formatCurrency(advance.amount)} for ${advance.employeeName}`)
          } else {
            toast(`Rejected advance for ${advance.employeeName}`, 'warning')
          }
          setDecision(null)
          navigate('/employees/advances')
        }}
        tone={decision === 'reject' ? 'danger' : 'default'}
        title={decision === 'approve' ? 'Approve advance' : 'Reject advance'}
        confirmLabel={decision === 'approve' ? 'Approve' : 'Reject'}
        message={
          decision === 'approve' ? (
            <>Approve advance of <strong>{formatCurrency(advance.amount)}</strong> for {advance.employeeName}? This becomes a pending deduction against their next payroll run.</>
          ) : (
            <>Reject the advance request for {advance.employeeName}?</>
          )
        }
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  )
}
