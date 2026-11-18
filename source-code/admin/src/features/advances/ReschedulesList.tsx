import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { RESCHEDULE_TONE } from './schedule-status'

export interface RescheduleItem {
  id: number
  installmentAmount: number
  startPeriod: string
  note: string
  status: 'Pending' | 'Approved' | 'Rejected'
  requestedBy: string | null
  requestedOn: string
  decidedBy: string | null
  decisionReason: string | null
}

interface ReschedulesListProps {
  reschedules: RescheduleItem[]
  /** "a month" / "a period" */
  per: string
  canDecide: boolean
  busy?: boolean
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

/* Reschedule requests on an advance — shared by salary and estate owner advances. The server refuses a self-approval. */
export function ReschedulesList({ reschedules, per, canDecide, busy, onApprove, onReject }: ReschedulesListProps) {
  return (
    <ul className="divide-y divide-border text-sm">
      {reschedules.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <div>
            <p className="text-text">
              {formatCurrency(r.installmentAmount)} {per} from {r.startPeriod}
              <span className="text-text-muted"> — “{r.note}”</span>
            </p>
            <p className="text-xs text-text-muted">
              Requested by {r.requestedBy ?? '—'} on {formatDate(r.requestedOn)}
              {r.decidedBy && ` · ${r.status} by ${r.decidedBy}${r.decisionReason ? `: ${r.decisionReason}` : ''}`}
            </p>
          </div>
          {r.status === 'Pending' && canDecide ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" loading={busy} onClick={() => onReject(r.id)}>
                Reject
              </Button>
              <Button size="sm" loading={busy} onClick={() => onApprove(r.id)}>
                Approve
              </Button>
            </div>
          ) : (
            <StatusBadge tone={RESCHEDULE_TONE[r.status]}>{r.status}</StatusBadge>
          )}
        </li>
      ))}
    </ul>
  )
}
