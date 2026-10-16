import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Input } from '@/components/ui/Input'
import { formatPercent, formatWeight } from '@/lib/format'
import * as collectionsService from '@/services/collections'
import { GRADE_ORDER, parseWeight } from './weights'
import type { CollectionRecord, GradeLine, TeaGrade } from './types'

/** grade = first grading · edit = change it inside the OPEN window · correction = request after it locks. */
export type GradingMode = 'grade' | 'edit' | 'correction'

interface GradeDeliveryModalProps {
  record: CollectionRecord
  open: boolean
  mode: GradingMode
  loading?: boolean
  onClose: () => void
  onSubmit: (lines: GradeLine[], reason?: string) => void
}

const COPY: Record<GradingMode, { title: string; enter: string; save: string }> = {
  grade: { title: 'Grade this delivery', enter: 'Review', save: 'Save grades' },
  edit: { title: 'Edit grading', enter: 'Review', save: 'Save edit' },
  correction: { title: 'Request a correction', enter: 'Review', save: 'Submit correction request' },
}

/*
  Factory-side grading. A delivery can carry several grades (one line per grade). Two steps:
  enter the weights, then a REVIEW that summarises estate weight, each line, the factory total
  and the difference before anything is saved. Hard errors (zero, negative, non-numeric) block;
  the tolerance and "unusual for this estate" checks only warn — both thresholds come from the
  server's settings (ADM-03), not from this file. The estate weight is never overwritten.
*/
export function GradeDeliveryModal({ record, open, mode, loading, onClose, onSubmit }: GradeDeliveryModalProps) {
  const copy = COPY[mode]
  const needsReason = mode !== 'grade'
  const [step, setStep] = useState<'enter' | 'review'>('enter')
  const [reason, setReason] = useState('')
  const [values, setValues] = useState<Record<TeaGrade, string>>(() => ({
    Super: String(record.gradeLines.find((l) => l.grade === 'Super')?.weightKg ?? ''),
    Normal: String(record.gradeLines.find((l) => l.grade === 'Normal')?.weightKg ?? ''),
  }))

  const { data: ctx } = useQuery({
    queryKey: ['grading-context', record.id],
    queryFn: () => collectionsService.getGradingContext(record.id),
    enabled: open,
  })

  const parsed = GRADE_ORDER.map((grade) => ({ grade, ...parseWeight(values[grade]) }))
  const hasError = parsed.some((p) => p.error)
  const lines: GradeLine[] = parsed.flatMap((p) => (p.kg !== null ? [{ grade: p.grade, weightKg: p.kg }] : []))
  const total = lines.reduce((s, l) => s + l.weightKg, 0)
  const diff = total - record.estateWeightKg
  const diffFraction = record.estateWeightKg > 0 ? Math.abs(diff) / record.estateWeightKg : 0
  const reasonOk = !needsReason || reason.trim().length >= 3
  const canReview = lines.length > 0 && !hasError && reasonOk

  const beyondTolerance = !!ctx && diffFraction > ctx.toleranceFraction
  const unusual = !!ctx?.usual && lines.length > 0 && (total < ctx.usual.lowKg || total > ctx.usual.highKg)

  const close = () => {
    setStep('enter')
    onClose()
  }

  if (step === 'review') {
    return (
      <LightConfirmModal
        open={open}
        onClose={() => setStep('enter')}
        cancelLabel="Back"
        onConfirm={() => onSubmit(lines, needsReason ? reason.trim() : undefined)}
        title="Review before saving"
        confirmLabel={copy.save}
        loading={loading}
        message={
          mode === 'grade' ? (
            <>
              Saving <strong className="text-text">confirms</strong> this record. You can still edit it
              {ctx ? ` for ${ctx.correctionWindowMin} minutes` : ' for a short window'}; after that it locks and changes
              need a Manager-approved correction. The estate owner is notified once the window ends.
            </>
          ) : mode === 'edit' ? (
            <>This delivery is still inside its correction window, so the change applies directly and is kept as a new revision.</>
          ) : (
            <>
              This delivery is locked. Nothing changes until a Manager approves; the current grading stays on record and an
              approval is added as a new revision.
            </>
          )
        }
      >
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-y-1 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3 text-sm">
            <dt className="text-text-muted">Estate weight (agent)</dt>
            <dd className="tabular text-right text-text">{formatWeight(record.estateWeightKg)}</dd>
            {lines.map((l) => (
              <Line key={l.grade} label={`${l.grade}`} value={formatWeight(l.weightKg)} />
            ))}
            <dt className="text-text-muted">Factory total</dt>
            <dd className="tabular text-right font-medium text-text-heading">{formatWeight(total)}</dd>
            <dt className="text-text-muted">Difference from estate weight</dt>
            <dd className="tabular text-right text-text">
              {diff > 0 ? '+' : ''}
              {formatWeight(diff)} ({formatPercent(diffFraction * 100)})
            </dd>
          </dl>

          {mode !== 'grade' && record.graded && (
            <p className="text-xs text-text-muted">
              Currently: {record.gradeLines.map((l) => `${l.grade} ${formatWeight(l.weightKg)}`).join(', ')} (
              {formatWeight(record.weightKg)})
            </p>
          )}
          {needsReason && (
            <p className="text-sm text-text">
              <span className="text-text-muted">Reason:</span> {reason.trim()}
            </p>
          )}

          {beyondTolerance && ctx && (
            <Warning>
              The factory total is {formatPercent(diffFraction * 100)} away from the estate weight, beyond the{' '}
              {formatPercent(ctx.toleranceFraction * 100)} tolerance. You can still save — a weight-mismatch complaint
              will be recorded and both figures stay on file.
            </Warning>
          )}
          {unusual && ctx?.usual && (
            <Warning>
              {formatWeight(total)} is far outside this estate's usual deliveries (typically about{' '}
              {formatWeight(ctx.usual.medianKg)}, from its last {ctx.usual.sampleSize}). Double-check the figures.
            </Warning>
          )}
        </div>
      </LightConfirmModal>
    )
  }

  return (
    <LightConfirmModal
      open={open}
      onClose={close}
      onConfirm={() => setStep('review')}
      title={copy.title}
      confirmLabel={copy.enter}
      confirmDisabled={!canReview}
      message={
        <>
          Enter the weight received at the factory for each grade. Leave a grade blank if there is none. Grading is a
          factory step; agents and estate owners never set it.
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {parsed.map((p) => (
            <Input
              key={p.grade}
              label={`${p.grade} (kg)`}
              inputMode="decimal"
              placeholder="0"
              value={values[p.grade]}
              error={p.error}
              onChange={(e) => setValues((v) => ({ ...v, [p.grade]: e.target.value }))}
            />
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-y-1 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3 text-sm">
          <dt className="text-text-muted">Estate weight (agent)</dt>
          <dd className="tabular text-right text-text">{formatWeight(record.estateWeightKg)}</dd>
          <dt className="text-text-muted">Factory total</dt>
          <dd className="tabular text-right font-medium text-text-heading">{formatWeight(total)}</dd>
          <dt className="text-text-muted">Difference</dt>
          <dd className="tabular text-right text-text">
            {lines.length === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatWeight(diff)}`}
          </dd>
        </dl>
        {needsReason && (
          <Input
            label="Reason (required)"
            placeholder={mode === 'edit' ? 'What was wrong with the first entry?' : 'Why does the grading need correcting?'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        {lines.length === 0 && !hasError && <p className="text-xs text-text-muted">Enter at least one grade weight.</p>}
      </div>
    </LightConfirmModal>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="pl-3 text-text-muted">— {label}</dt>
      <dd className="tabular text-right text-text">{value}</dd>
    </>
  )
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg/60 p-3 text-sm text-text">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-fg" aria-hidden />
      <p>{children}</p>
    </div>
  )
}
