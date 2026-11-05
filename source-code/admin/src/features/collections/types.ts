/*
  Grades are assigned FACTORY-SIDE ONLY, at receiving. Agents and owners record only the
  estate weight and the mobile app has no grade input. A delivery with no grade lines is
  simply "Ungraded". Super and Normal today; a grade catalogue can replace this union later.
*/
export type TeaGrade = 'Super' | 'Normal'

/** One factory-assigned grade line. A delivery has at most one line per grade. */
export interface GradeLine {
  grade: TeaGrade
  weightKg: number
}

/*
  Status chain per master §5, plus "Pending Agent Confirmation" — the web-
  originated provisional state introduced by COL-02 (exception entry). Weight
  stays agent-entered (§7.1): the web portal never overrides field weights.
*/
export type CollectionStatus =
  | 'Submitted'
  | 'Approved'
  | 'Agent Assigned'
  | 'Collected'
  | 'Confirmed'
  | 'Pending Agent Confirmation'

export interface EvidencePhoto {
  /** which link of the evidence chain this is */
  label: 'Agent collection photo' | 'Manager verification photo' | 'Handover photo'
  timestamp: string
  takenBy: string
}

export interface TimelineEntry {
  status: CollectionStatus
  timestamp: string
  by?: string
}

/**
 * A graded delivery's lifecycle. OPEN: the grading officer (or anyone with the grading
 * permission) can still edit directly. LOCKED: only a correction request a Manager approves.
 * SETTLED: paid — an approved correction becomes a signed adjustment in the next settlement.
 */
export type GradingState = 'open' | 'locked' | 'settled'

export type OwnerNotificationStatus = 'Queued' | 'Sent' | 'Correction sent' | 'Failed' | 'Cancelled'

export interface GradeRevision {
  revisionNo: number
  kind: 'initial' | 'open_edit' | 'correction'
  lines: GradeLine[]
  totalKg: number
  reason: string | null
  changedBy: string
  changedAt: string
  approvedBy: string | null
  approvedAt: string | null
}

export interface CorrectionRequest {
  id: number
  deliveryId: string
  lines: GradeLine[]
  currentLines: GradeLine[]
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestedBy: string
  requestedAt: string
  decidedBy: string | null
  decidedAt: string | null
  decisionNote: string | null
  /** pending requests only: what approving it would do to money */
  impact?: { settled: boolean; settlementId: string | null; adjustmentRs: number }
}

/** What the grading review step warns against (server-configured, never hardcoded here). */
export interface GradingContext {
  estateWeightKg: number
  /** fraction, e.g. 0.05 */
  toleranceFraction: number
  correctionWindowMin: number
  usual: { medianKg: number; sampleSize: number; lowKg: number; highKg: number } | null
}

export interface CollectionRecord {
  id: string
  estateId: string
  estateName: string
  route: string
  /**
   * TOTAL weight: the sum of the grade lines once graded, else the estate weight. Computed
   * by the server in one place (see `weights.ts` for the matching selector) — never
   * recompute a delivery's total in a component.
   */
  weightKg: number
  /** What the agent weighed at the estate (owner-confirmed). Kept separate for the mismatch check. */
  estateWeightKg: number
  /** Factory grade lines; empty = Ungraded. */
  gradeLines: GradeLine[]
  graded: boolean
  status: CollectionStatus
  date: string
  agent: string
  photos: EvidencePhoto[]
  timeline: TimelineEntry[]
  /** present when a weight-mismatch complaint exists on this record */
  mismatch?: { complaintId: string; note: string }
  /** present on web-originated exception entries (COL-02) */
  provisional?: { reportedBy: string; reason: string }
  lastUpdatedBy?: string
  lastUpdatedOn?: string
  /** set once graded */
  gradingState?: GradingState
  /** ISO — when the OPEN window closes (snapshot taken at grading time) */
  lockedAt?: string
  /** the processed settlement that paid this delivery */
  settlementId?: string
  /** times the grade lines were revised after the first grading */
  revisionCount?: number
  pendingCorrectionId?: number
  notificationStatus?: OwnerNotificationStatus
}
