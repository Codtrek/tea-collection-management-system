import { History, Lock, Mail, RotateCw } from 'lucide-react'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDateTime, formatWeight } from '@/lib/format'
import { sortedLines } from './weights'
import type {
  CorrectionRequest,
  GradeLine,
  GradeRevision,
  GradingState,
  OwnerNotificationStatus,
} from './types'

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** OPEN / LOCKED / SETTLED badge — always text + icon, never colour alone. */
export function GradingStateBadge({
  state,
  lockedAt,
  settlementId,
}: {
  state: GradingState
  lockedAt?: string
  settlementId?: string
}) {
  if (state === 'open') {
    return <StatusBadge tone="warning">Open{lockedAt ? ` · locks ${time(lockedAt)}` : ''}</StatusBadge>
  }
  if (state === 'settled') {
    return (
      <StatusBadge tone="assigned" icon={<Lock />}>
        Settled{settlementId ? ` · ${settlementId}` : ''}
      </StatusBadge>
    )
  }
  return (
    <StatusBadge tone="success" icon={<Lock />}>
      Locked
    </StatusBadge>
  )
}

const describe = (lines: GradeLine[]) =>
  sortedLines(lines)
    .map((l) => `${l.grade} ${formatWeight(l.weightKg)}`)
    .join(' · ')

/** "Super 50→60 (+10 kg) · Normal 30→20 (−10 kg)" between two sets of lines. */
function diff(prev: GradeLine[], next: GradeLine[]): string {
  const parts: string[] = []
  for (const grade of ['Super', 'Normal'] as const) {
    const a = prev.find((l) => l.grade === grade)?.weightKg ?? 0
    const b = next.find((l) => l.grade === grade)?.weightKg ?? 0
    if (a === b) continue
    const d = b - a
    parts.push(`${grade} ${formatWeight(a)} → ${formatWeight(b)} (${d > 0 ? '+' : '−'}${formatWeight(Math.abs(d))})`)
  }
  return parts.length ? parts.join(' · ') : 'No weight change'
}

const KIND: Record<GradeRevision['kind'], string> = {
  initial: 'Graded',
  open_edit: 'Edited while open',
  correction: 'Correction (approved)',
}

/* "Revised 2 times" + every revision with who, when, why, who approved and a diff against the one before. */
export function RevisionHistory({ revisions }: { revisions: GradeRevision[] }) {
  const revised = Math.max(0, revisions.length - 1)
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <h3 className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-text-heading">
        <History className="size-3.5 text-text-muted" aria-hidden />
        Grading history
      </h3>
      <p className="mb-3 text-xs text-text-muted">
        {revised === 0 ? 'Not revised since it was graded.' : `Revised ${revised} time${revised === 1 ? '' : 's'}`} — earlier
        revisions are kept, never overwritten.
      </p>
      <ol className="flex flex-col gap-3">
        {[...revisions].reverse().map((r) => {
          const prev = revisions.find((x) => x.revisionNo === r.revisionNo - 1)
          return (
            <li key={r.revisionNo} className="rounded-[var(--radius-md)] border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-text">
                  Revision {r.revisionNo} · {KIND[r.kind]}
                </span>
                <span className="tabular text-xs text-text-muted">{formatDateTime(r.changedAt)}</span>
              </div>
              <p className="mt-1 text-text">
                {describe(r.lines)} <span className="text-text-muted">({formatWeight(r.totalKg)})</span>
              </p>
              {prev && <p className="tabular mt-0.5 text-xs text-text-muted">{diff(prev.lines, r.lines)}</p>}
              <p className="mt-1 text-xs text-text-muted">
                By {r.changedBy}
                {r.approvedBy ? ` · approved by ${r.approvedBy}${r.approvedAt ? ` (${formatDateTime(r.approvedAt)})` : ''}` : ''}
                {r.reason ? ` · “${r.reason}”` : ''}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** A pending correction request: what changes, why, and (for a settled delivery) what it does to money. */
export function PendingCorrection({
  request,
  canDecide,
  onApprove,
  onReject,
}: {
  request: CorrectionRequest
  canDecide: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const settled = request.impact?.settled
  const rs = request.impact?.adjustmentRs ?? 0
  return (
    <div className="mt-4 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg/60 p-3.5 text-sm text-text">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-warning-fg">Correction requested — waiting for a Manager</p>
          <p className="mt-1">
            {diff(request.currentLines, request.lines)}
            <span className="text-text-muted"> · by {request.requestedBy}, {formatDateTime(request.requestedAt)}</span>
          </p>
          <p className="mt-0.5 text-text-muted">“{request.reason}”</p>
          {settled && (
            <p className="mt-2">
              <strong>This delivery was already paid</strong> ({request.impact?.settlementId}). The payment is not
              rewritten: approving carries{' '}
              <strong className="tabular">
                {rs >= 0 ? '+' : '−'} {formatCurrency(Math.abs(rs))}
              </strong>{' '}
              into the estate's next settlement.
            </p>
          )}
        </div>
        {canDecide && (
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={onReject}>
              Reject
            </Button>
            <Button onClick={onApprove}>Approve</Button>
          </div>
        )}
      </div>
    </div>
  )
}

const NOTICE_TONE: Record<OwnerNotificationStatus, BadgeTone> = {
  Queued: 'warning',
  Sent: 'success',
  'Correction sent': 'success',
  Failed: 'danger',
  Cancelled: 'neutral',
}

/* What the estate owner has been told: held until the window ends, then sent once. */
export function OwnerNotice({
  status,
  canResend,
  resending,
  onResend,
}: {
  status: OwnerNotificationStatus
  canResend: boolean
  resending: boolean
  onResend: () => void
}) {
  const note: Record<OwnerNotificationStatus, string> = {
    Queued: 'Held until the correction window ends (or the grading is finalized), then sent once.',
    Sent: 'The estate owner has been told what the factory received.',
    'Correction sent': 'A correction notice with the old and new figures was sent; the original is unchanged.',
    Failed: 'It could not be delivered. Check the estate has an owner account, then resend.',
    Cancelled: 'This notification was cancelled and will not be sent.',
  }
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-heading">
        <Mail className="size-3.5 text-text-muted" aria-hidden />
        Estate owner notification
      </h3>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge tone={NOTICE_TONE[status]}>{status}</StatusBadge>
          <p className="text-sm text-text-muted">{note[status]}</p>
        </div>
        {status === 'Failed' && canResend && (
          <Button variant="secondary" onClick={onResend} loading={resending}>
            <RotateCw className="size-4" /> Resend
          </Button>
        )}
      </div>
    </section>
  )
}
