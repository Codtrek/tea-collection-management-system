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
}
