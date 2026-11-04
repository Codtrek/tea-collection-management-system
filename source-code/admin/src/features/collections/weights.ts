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

/**
 * One grade's input box → a line weight. '' = no line for this grade. Anything else must be a
 * positive number with at most 2 decimals; zero, negative and non-numeric entries are errors
 * (they block saving) rather than being silently dropped.
 */
export function parseWeight(raw: string): { kg: number | null; error?: string } {
  const text = raw.trim()
  if (text === '') return { kg: null }
  if (!/^-?\d*\.?\d+$/.test(text)) return { kg: null, error: 'Enter a number, e.g. 42.5' }
  const n = Number(text)
  if (n <= 0) return { kg: null, error: 'Must be more than 0 — leave it blank for no line' }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { kg: null, error: 'Up to 2 decimal places' }
  return { kg: n }
}
