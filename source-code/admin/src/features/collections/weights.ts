import type { CollectionRecord, GradeLine, TeaGrade } from './types'

/*
  The portal's single selector for a delivery's per-grade weights. The authoritative total
  is computed server-side (`weightSummary` in the backend's collection-map.ts) and arrives
  as `record.weightKg`; these helpers only read the grade lines, they never re-derive a
  delivery's total.
*/

/** Display order: Super first. */
export const GRADE_ORDER: TeaGrade[] = ['Super', 'Normal']

/** Weight of one grade on a delivery (0 when that grade is absent or the delivery is ungraded). */
export function gradeKg(record: Pick<CollectionRecord, 'gradeLines'>, grade: TeaGrade): number {
  return record.gradeLines.find((l) => l.grade === grade)?.weightKg ?? 0
}

/** Does the delivery contain a line for this grade? (what the grade filter matches) */
export function hasGrade(record: Pick<CollectionRecord, 'gradeLines'>, grade: TeaGrade): boolean {
  return record.gradeLines.some((l) => l.grade === grade)
}

/** Lines in display order (Super before Normal). */
export function sortedLines(lines: GradeLine[]): GradeLine[] {
  return [...lines].sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade))
}
