/** Derived from expiry date — see batchStatus() in data.ts. */
export type BatchStatus = 'Fresh' | 'Expiring soon' | 'Expired' | 'Discarded'

/** Fertilizer proper vs beneficiary items (rice/food) — same request→dispatch→deduct flow (addendum §11.25). */
export type ItemCategory = 'Fertilizer' | 'Beneficiary'

export interface FertilizerBatch {
  id: string
  /** kept generic ("Item"), not hardcoded to fertilizer — beneficiary items fold in via category */
  item: string
  category: ItemCategory
  quantityKg: number
  unit: 'kg' | 'bags'
  receivedDate: string
  expiryDate: string
  location: string
  supplier: string
  lotNumber: string
  qualityNotes?: string
  discarded?: boolean
  lastUpdatedBy?: string
  lastUpdatedOn?: string
}

export type MovementType = 'Incoming' | 'Outgoing'

export interface StockMovement {
  id: string
  batchId: string
  type: MovementType
  quantityKg: number
  date: string
  /** Outgoing: Tea Estate Owner or Collection Agent receiving the stock */
  destination?: string
  /** Outgoing: approved fertilizer request this dispatch fulfils (UC-032/038) */
  linkedRequest?: string
  /** Incoming */
  supplier?: string
  notes?: string
  recordedBy: string
}

/*
  Request lifecycle (addendum §4):
  Submitted → Approved → (Partially Dispatched) → Dispatched → Deducted
  Submitted/Approved → Rejected | Cancelled (terminal)
  Approval commits stock; only Approved+ contributes to Committed.
*/
export type RequestStatus =
  | 'Submitted'
  | 'Approved'
  | 'Partially Dispatched'
  | 'Dispatched'
  | 'Deducted'
  | 'Rejected'
  | 'Cancelled'

/** How the request reached the portal — mobile (owner self-service) or web (phoned-in, logged via FERT-07). */
export type RequestOrigin = 'mobile' | 'web'

export interface FertilizerRequest {
  id: string
  estateName: string
  item: string
  quantityKg: number
  requestedDate: string
  origin: RequestOrigin
  status: RequestStatus
  reason?: string
  /** Set once approved (may be < requested for a partial fulfilment). */
  approvedQtyKg?: number
  /** Running total delivered against the approved quantity. */
  dispatchedQtyKg?: number
  decidedBy?: string
  decidedOn?: string
}

/** Coverage health of an item's available stock against its pending demand. */
export type CoverageStatus = 'Healthy' | 'Tight' | 'Short'

/**
 * Per-item stock position (addendum §5.2). Computed only in position.ts — never
 * recalculated in a component. `available` = onHand − committed − expired and may
 * be negative (over-committed), which is the whole point of the page.
 */
export interface ItemPosition {
  item: string
  category: ItemCategory
  onHand: number
  committed: number
  available: number
  pendingDemand: number
  /** available ÷ pendingDemand, as a fraction; null when there is no pending demand. */
  coverageRatio: number | null
  status: CoverageStatus
}
