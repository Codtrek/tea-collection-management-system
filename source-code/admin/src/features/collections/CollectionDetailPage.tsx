import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Flag, Loader2, Lock, Pencil, Scale, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PhotoEvidenceGallery } from '@/components/patterns/PhotoEvidenceGallery'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { HighStakesConfirmFlow } from '@/components/patterns/HighStakesConfirmFlow'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as collectionsService from '@/services/collections'
import { COLLECTION_TONE, isLocked } from './status'
import { GradeChips } from './GradeChips'
import { GradeDeliveryModal, type GradingMode } from './GradeDeliveryModal'
import { GradingStateBadge, OwnerNotice, PendingCorrection, RevisionHistory } from './GradingPanels'
import type { CollectionStatus, CorrectionRequest, GradeLine } from './types'
import { formatCurrency, formatDate, formatDateTime, formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'

const CHAIN: CollectionStatus[] = ['Submitted', 'Approved', 'Agent Assigned', 'Collected', 'Confirmed']

/* COL-03 — full record view; Estate Owner Detail's Deliveries tab links here. */
export function CollectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { can } = useAuth()
  // Two separate permissions (ADM-02): an Officer grades / edits while open / requests corrections;
  // a Manager approves them. Neither is a role check — both read the configurable matrix.
  const canEdit = can('collection', 'edit')
  const canGradeEdit = can('grading', 'edit')
  const canApprove = can('gradingApproval', 'approve')
  const [gradingMode, setGradingMode] = useState<GradingMode | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [deciding, setDeciding] = useState<{ request: CorrectionRequest; action: 'approve' | 'reject' } | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const {
    data: record,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => collectionsService.getById(id!),
    enabled: !!id,
  })

  const graded = !!record?.gradingState
  const { data: revisions } = useQuery({
    queryKey: ['collection', id, 'revisions'],
    queryFn: () => collectionsService.listRevisions(id!),
    enabled: !!id && graded,
  })
  const { data: corrections } = useQuery({
    queryKey: ['collection', id, 'corrections'],
    queryFn: () => collectionsService.listCorrections(id!),
    enabled: !!id && graded,
  })
  const pending = corrections?.find((c) => c.status === 'pending')

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['collection', id] })
    void queryClient.invalidateQueries({ queryKey: ['collections'] })
    void queryClient.invalidateQueries({ queryKey: ['estates'] })
  }
  const fail = (fallback: string) => (err: unknown) => toast(err instanceof Error ? err.message : fallback, 'danger')

  const gradeMutation = useMutation({
    mutationFn: async ({ lines, reason }: { lines: GradeLine[]; reason?: string }) => {
      if (gradingMode === 'correction') await collectionsService.requestCorrection(id!, lines, reason ?? '')
      else await collectionsService.setGradeLines(id!, lines, reason)
    },
    onSuccess: () => {
      toast(
        gradingMode === 'correction'
          ? 'Correction requested — a Manager will review it'
          : gradingMode === 'edit'
            ? 'Grading updated — kept as a new revision'
            : 'Graded and confirmed — editable until the correction window ends',
      )
      setGradingMode(null)
      refresh()
    },
    onError: fail('Could not save the grading'),
  })

  const finalizeMutation = useMutation({
    mutationFn: () => collectionsService.finalize(id!),
    onSuccess: () => {
      toast('Grading finalized — the delivery is now locked')
      setFinalizing(false)
      refresh()
    },
    onError: fail('Could not finalize'),
  })

  const decideMutation = useMutation({
    mutationFn: ({ request, action }: { request: CorrectionRequest; action: 'approve' | 'reject' }) =>
      action === 'approve'
        ? collectionsService.approveCorrection(request.id)
        : collectionsService.rejectCorrection(request.id, rejectNote.trim()),
    onSuccess: (_, { action }) => {
      toast(action === 'approve' ? 'Correction approved — applied as a new revision' : 'Correction rejected')
      setDeciding(null)
      setRejectNote('')
      refresh()
    },
    onError: fail('Could not record the decision'),
  })

  const resendMutation = useMutation({
    mutationFn: () => collectionsService.resendNotification(id!),
    onSuccess: () => {
      toast('Notification queued to resend')
      refresh()
    },
    onError: fail('Could not resend'),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !record) {
    return <ErrorState title="Record not found" description={`No collection record “${id}”.`} onRetry={() => void refetch()} />
  }

  const locked = isLocked(record)
  const state = record.gradingState
  // Grading is a factory-side step: staff with the grading permission, once the agent has collected.
  const canGrade = canGradeEdit && record.status === 'Collected'

  return (
    <div>
      <PageHeader
        title={record.estateName}
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Tea Leaf Collection', to: '/collections' }, { label: record.id }]}
        actions={
          <>
            {canGrade && (
              <Button onClick={() => setGradingMode('grade')}>
                <Scale className="size-4" /> Grade Delivery
              </Button>
            )}
            {state === 'open' && canGradeEdit && (
              <>
                <Button variant="secondary" onClick={() => setGradingMode('edit')}>
                  <Pencil className="size-4" /> Edit grading
                </Button>
                <Button variant="secondary" onClick={() => setFinalizing(true)}>
                  <Lock className="size-4" /> Finalize
                </Button>
              </>
            )}
            {(state === 'locked' || state === 'settled') && canGradeEdit && !pending && (
              <Button variant="secondary" onClick={() => setGradingMode('correction')}>
                <Flag className="size-4" /> Request correction
              </Button>
            )}
            {!locked && canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/collections/${record.id}/edit`)}>
                <Pencil className="size-4" /> Edit
              </Button>
            )}
          </>
        }
      />

      {/* Header card */}
      <div className="mb-4 rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-1)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="id text-xs text-text-muted">{record.id}</p>
            <h2 className="text-lg font-semibold text-text-heading">{record.estateName}</h2>
            <p className="text-sm text-text-muted">
              {record.route} · Agent: {record.agent} · {formatDate(record.date)}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular text-3xl font-semibold text-text-heading">{formatWeight(record.weightKg)}</p>
            <p className="text-xs text-text-muted">
              {record.graded
                ? 'graded total'
                : record.status === 'Pending Agent Confirmation'
                  ? 'reported estate weight · ungraded'
                  : 'estate weight · ungraded'}
            </p>
            {record.graded && record.estateWeightKg !== record.weightKg && (
              <p className="tabular mt-0.5 text-xs text-text-muted">Estate weight {formatWeight(record.estateWeightKg)}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge
              tone={COLLECTION_TONE[record.status]}
              icon={record.status === 'Pending Agent Confirmation' ? <Upload /> : locked ? <Lock /> : undefined}
            >
              {record.status}
            </StatusBadge>
            {state && <GradingStateBadge state={state} lockedAt={record.lockedAt} settlementId={record.settlementId} />}
            <GradeChips record={record} expanded />
          </div>
        </div>

        {record.provisional && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg/60 p-3.5 text-sm text-text">
            <strong className="text-warning-fg">Provisional record</strong> — logged by {record.provisional.reportedBy} outside
            the mobile flow: “{record.provisional.reason}” The assigned agent must confirm the actual weight before this
            becomes official.
          </div>
        )}

        {record.mismatch && (
          <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-danger-fg/20 bg-danger-bg/60 p-3.5">
            <Flag className="mt-0.5 size-4 shrink-0 text-danger-fg" />
            <p className="text-sm text-text">
              <strong className="text-danger-fg">Weight mismatch complaint</strong> — {record.mismatch.note}{' '}
              <Link to="/notifications" className="font-medium text-primary underline-offset-2 hover:underline">
                {record.mismatch.complaintId}
              </Link>
            </p>
          </div>
        )}

        {pending && (
          <PendingCorrection
            request={pending}
            canDecide={canApprove}
            onApprove={() => setDeciding({ request: pending, action: 'approve' })}
            onReject={() => setDeciding({ request: pending, action: 'reject' })}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* Photo evidence chain */}
          <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h3 className="mb-3 text-[13px] font-semibold text-text-heading">Photo evidence</h3>
            <PhotoEvidenceGallery photos={record.photos} />
          </section>

          {/* Route & agent */}
          <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h3 className="mb-3 text-[13px] font-semibold text-text-heading">Route & agent</h3>
            <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              <InfoRow label="Route" value={record.route} />
              <InfoRow label="Collection agent" value={record.agent} />
              <InfoRow label="Estate" value={record.estateName} />
              <InfoRow label="Delivery date" value={formatDate(record.date)} />
            </dl>
          </section>

          {revisions && revisions.length > 0 && <RevisionHistory revisions={revisions} />}

          {record.notificationStatus && (
            <OwnerNotice
              status={record.notificationStatus}
              canResend={canGradeEdit}
              resending={resendMutation.isPending}
              onResend={() => resendMutation.mutate()}
            />
          )}
        </div>

        {/* Status timeline */}
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-text-heading">Status timeline</h3>
          <ol className="flex flex-col gap-0">
            {(record.status === 'Pending Agent Confirmation' ? record.timeline.map((t) => t.status) : CHAIN).map((status, i, arr) => {
              const entry = record.timeline.find((t) => t.status === status)
              const done = !!entry
              const last = i === arr.length - 1
              return (
                <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && (
                    <span
                      aria-hidden
                      className={cn('absolute left-[11px] top-6 h-[calc(100%-14px)] w-0.5 rounded', done ? 'bg-primary/40' : 'bg-border')}
                    />
                  )}
                  <span
                    className={cn(
                      'z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-xs',
                      done ? 'bg-primary text-white' : 'border border-border-strong bg-surface text-text-disabled',
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', done ? 'text-text' : 'text-text-muted')}>{status}</p>
                    {entry ? (
                      <p className="tabular text-xs text-text-muted">
                        {formatDateTime(entry.timestamp)}
                        {entry.by ? ` · ${entry.by}` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-text-disabled">Pending</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
          {locked && (
            <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-text-muted">
              <Lock className="size-3.5" aria-hidden />{' '}
              {state === 'open'
                ? 'Confirmed — still editable until the correction window ends.'
                : 'Confirmed with photographic evidence — this record is locked (§7.1). Changes need a Manager-approved correction.'}
            </p>
          )}
        </section>
      </div>

      {gradingMode && (
        <GradeDeliveryModal
          // remount per open so the inputs always start from the saved lines
          key={gradingMode}
          record={record}
          open
          mode={gradingMode}
          loading={gradeMutation.isPending}
          onClose={() => setGradingMode(null)}
          onSubmit={(lines, reason) => gradeMutation.mutate({ lines, reason })}
        />
      )}

      <LightConfirmModal
        open={finalizing}
        onClose={() => setFinalizing(false)}
        onConfirm={() => finalizeMutation.mutate()}
        loading={finalizeMutation.isPending}
        title="Finalize grading"
        confirmLabel="Finalize"
        message={
          <>
            <strong>{record.id}</strong> locks now instead of waiting for the correction window to end, and the estate
            owner's notification is released. Later changes need a Manager-approved correction.
          </>
        }
      />

      {/* A correction on a PAID delivery moves money, so it gets the re-type-the-amount flow. */}
      {deciding?.action === 'approve' && deciding.request.impact?.settled ? (
        <HighStakesConfirmFlow
          open
          onClose={() => setDeciding(null)}
          onConfirm={() => decideMutation.mutate(deciding)}
          loading={decideMutation.isPending}
          title="Approve correction on a settled delivery"
          confirmLabel="Approve correction"
          amount={deciding.request.impact.adjustmentRs}
          review={
            <div className="flex flex-col gap-2 text-sm text-text">
              <p>
                <strong>{record.id}</strong> was paid in settlement {deciding.request.impact.settlementId}. That payment
                will <strong>not</strong> be changed. Instead a signed adjustment of{' '}
                <strong className="tabular">
                  {deciding.request.impact.adjustmentRs >= 0 ? '+' : '−'}{' '}
                  {formatCurrency(Math.abs(deciding.request.impact.adjustmentRs))}
                </strong>{' '}
                (priced at the rates of that settlement) is carried into {record.estateName}'s next settlement.
              </p>
              <p className="text-text-muted">“{deciding.request.reason}” — requested by {deciding.request.requestedBy}</p>
            </div>
          }
        />
      ) : (
        <LightConfirmModal
          open={!!deciding}
          onClose={() => {
            setDeciding(null)
            setRejectNote('')
          }}
          onConfirm={() => deciding && decideMutation.mutate(deciding)}
          loading={decideMutation.isPending}
          confirmDisabled={deciding?.action === 'reject' && rejectNote.trim().length === 0}
          tone={deciding?.action === 'reject' ? 'danger' : 'default'}
          title={deciding?.action === 'reject' ? 'Reject correction' : 'Approve correction'}
          confirmLabel={deciding?.action === 'reject' ? 'Reject' : 'Approve'}
          message={
            deciding?.action === 'reject' ? (
              <>The grading stays as it is. The officer sees your note.</>
            ) : (
              <>
                The new figures are applied as a <strong>new revision</strong>; the current grading stays in the history.
                The estate owner is sent a labelled correction notice.
              </>
            )
          }
        >
          {deciding?.action === 'reject' && (
            <Input
              label="Why is it being rejected? (required)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          )}
        </LightConfirmModal>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right text-text">{value}</dd>
    </div>
  )
}
