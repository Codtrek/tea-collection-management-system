export type TeaGrade = 'Super' | 'Normal' | 'Pending'

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
  weightKg: number
  grade: TeaGrade
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
