/* Performance (Performance-Addendum) — mirrors backend performance-rules.ts / PerformanceService. */

export type MeasureKey = 'attendance' | 'absences' | 'leave' | 'routeCompletion' | 'kg' | 'weightAccuracy' | 'fertilizer' | 'coverHelp'

export interface Measure {
  key: MeasureKey
  /** ok = a figure · not_enough = below the minimum data · info = shown, never marked up/down */
  status: 'ok' | 'not_enough' | 'info'
  value: number | null
  num: number | null
  den: number | null
  /** against the person's own previous 3 months — neutral, "up" is not "better" */
  trend: 'up' | 'down' | 'same' | null
  previous: number | null
  extra?: Record<string, number | string | null>
  reason?: string
}

export interface PersonMeasures {
  employeeId: string
  name: string
  role: string
  measures: Partial<Record<MeasureKey, Measure>>
  /** facts with counts, generated from rules — never a judgement */
  notes: string[]
}

export interface TeamPerformance {
  month: string
  span: 1 | 3
  group: 'agents' | 'staff'
  period: { from: string; to: string; label: string }
  tolerancePct: number
  measures: MeasureKey[]
  rows: PersonMeasures[]
  /** per group: "Collection agents", or each role for other staff */
  averages: Record<string, Partial<Record<MeasureKey, number | null>>>
  comingSoon: { key: string; label: string; reason: string }[]
}

/** One employee month by month — the Performance tab. */
export interface EmployeePerformance {
  employeeId: string
  name: string
  role: string
  isAgent: boolean
  tolerancePct: number
  measures: MeasureKey[]
  months: { month: string; label: string; measures: Partial<Record<MeasureKey, Measure>> }[]
  comingSoon: { key: string; label: string; reason: string }[]
  notes: PerformanceNote[]
}

/** A record behind a measure (a missed stop, a delivery outside the tolerance …). */
export interface DrillRow {
  date: string
  title: string
  detail: string | null
  /** e.g. "Owner-side" */
  tag: string | null
}

export interface PerformanceNote {
  id: number
  note: string
  author: string
  createdAt: string
}
