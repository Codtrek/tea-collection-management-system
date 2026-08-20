import { useState } from 'react'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Input } from '@/components/ui/Input'
import { formatWeight } from '@/lib/format'
import { GRADE_ORDER } from './weights'
import type { CollectionRecord, GradeLine, TeaGrade } from './types'

interface GradeDeliveryModalProps {
  record: CollectionRecord
  open: boolean
  loading?: boolean
  onClose: () => void
  onSubmit: (lines: GradeLine[]) => void
}

/*
  Factory-side grading at receiving. A delivery can carry several grades (one line per
  grade), so the Receiving Officer splits the received tea into Super and/or Normal. The
  estate weight is shown for reference only — it is never overwritten; the server compares
  the graded total against it and raises a weight-mismatch complaint if they stray apart.
  Saving confirms (locks) the record, hence the confirm-style modal.
*/
export function GradeDeliveryModal({ record, open, loading, onClose, onSubmit }: GradeDeliveryModalProps) {
  const [values, setValues] = useState<Record<TeaGrade, string>>(() => ({
    Super: String(record.gradeLines.find((l) => l.grade === 'Super')?.weightKg ?? ''),
    Normal: String(record.gradeLines.find((l) => l.grade === 'Normal')?.weightKg ?? ''),
  }))

  const lines: GradeLine[] = GRADE_ORDER.flatMap((grade) => {
    const kg = Number(values[grade])
    return Number.isFinite(kg) && kg > 0 ? [{ grade, weightKg: kg }] : []
  })
  const total = lines.reduce((s, l) => s + l.weightKg, 0)
  const diff = total - record.estateWeightKg

  return (
    <LightConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={() => onSubmit(lines)}
      title="Grade this delivery"
      confirmLabel="Save grades & confirm"
      loading={loading}
      message={
        <>
          Enter the weight received at the factory for each grade. Saving <strong className="text-text">confirms and locks</strong>{' '}
          this record — later changes need Flag for Correction. Grading is a factory step; agents and estate owners never set it.
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {GRADE_ORDER.map((grade) => (
            <Input
              key={grade}
              label={`${grade} (kg)`}
              type="number"
              min="0"
              step="0.1"
              value={values[grade]}
              onChange={(e) => setValues((v) => ({ ...v, [grade]: e.target.value }))}
            />
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-y-1 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3 text-sm">
          <dt className="text-text-muted">Estate weight (agent)</dt>
          <dd className="tabular text-right text-text">{formatWeight(record.estateWeightKg)}</dd>
          <dt className="text-text-muted">Graded total</dt>
          <dd className="tabular text-right font-medium text-text-heading">{formatWeight(total)}</dd>
          <dt className="text-text-muted">Difference</dt>
          <dd className="tabular text-right text-text">
            {lines.length === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatWeight(diff)}`}
          </dd>
        </dl>
        {lines.length === 0 && <p className="text-xs text-text-muted">Enter at least one grade weight to save.</p>}
      </div>
    </LightConfirmModal>
  )
}
