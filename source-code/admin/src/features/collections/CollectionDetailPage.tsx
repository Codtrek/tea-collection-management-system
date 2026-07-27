import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Flag, Lock, Pencil, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PhotoEvidenceGallery } from '@/components/patterns/PhotoEvidenceGallery'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from './data'
import { COLLECTION_TONE, isLocked } from './status'
import type { CollectionStatus } from './types'
import { formatDate, formatDateTime, formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'

const CHAIN: CollectionStatus[] = ['Submitted', 'Approved', 'Agent Assigned', 'Collected', 'Confirmed']

/* COL-03 — full record view; Estate Owner Detail's Deliveries tab links here. */
export function CollectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const canEdit = can('collection', 'edit')
  const [flagging, setFlagging] = useState(false)

  const record = COLLECTIONS.find((c) => c.id === id)
  if (!record) {
    return <ErrorState title="Record not found" description={`No collection record “${id}”.`} onRetry={() => navigate('/collections')} />
  }

  const locked = isLocked(record)

  return (
    <div>
      <PageHeader
        title={record.estateName}
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Tea Leaf Collection', to: '/collections' }, { label: record.id }]}
        actions={
          canEdit ? (
            locked ? (
              <Button variant="secondary" onClick={() => setFlagging(true)}>
                <Flag className="size-4" /> Flag for Correction
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => navigate(`/collections/${record.id}/edit`)}>
                <Pencil className="size-4" /> Edit
              </Button>
            )
          ) : undefined
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
              {record.status === 'Pending Agent Confirmation' ? 'reported weight' : 'measured weight'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge
              tone={COLLECTION_TONE[record.status]}
              icon={record.status === 'Pending Agent Confirmation' ? <Upload /> : locked ? <Lock /> : undefined}
            >
              {record.status}
            </StatusBadge>
            {record.grade !== 'Pending' && (
              <StatusBadge tone={record.grade === 'Super' ? 'gradeSuper' : 'gradeNormal'}>{record.grade} grade</StatusBadge>
            )}
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
              <Lock className="size-3.5" aria-hidden /> Confirmed with photographic evidence — this record is locked (§7.1).
            </p>
          )}
        </section>
      </div>

      {/* Flag for Correction — audit-tracked request, not a direct edit */}
      <LightConfirmModal
        open={flagging}
        onClose={() => setFlagging(false)}
        onConfirm={() => {
          toast('Correction request submitted — audit entry recorded')
          setFlagging(false)
        }}
        title="Flag for correction"
        confirmLabel="Submit Request"
        message={
          <>
            <strong>{record.id}</strong> is confirmed and locked. This submits an audit-tracked correction request —
            it does not edit the record directly.
          </>
        }
      >
        <Input label="What needs correcting?" placeholder="Describe the issue with this record" />
      </LightConfirmModal>
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
