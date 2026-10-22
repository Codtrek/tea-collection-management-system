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
  /** set on the ledger rows a request's handover / check-in wrote (read-only — FERT-02 is ad-hoc only) */
  linkedRequest?: string
  /** Incoming */
  supplier?: string
  notes?: string
  recordedBy: string
}

/*
  Request lifecycle — Fertilizer-Delivery-Addendum §3 (mirrors the backend's fertilizer-map.ts):
  Requested → Approved | Partially approved | Rejected  (or → Awaiting manager approval → …)
  → Ready for dispatch → Picked up → Out for delivery → Delivered | Partially delivered | Failed
  → Returned to factory → Rescheduled … → Needs review → Rescheduled (retry) | Cancelled
*/
export type RequestStatus =
  | 'Requested'
  | 'Awaiting manager approval'
  | 'Approved'
  | 'Partially approved'
  | 'Rejected'
  | 'Ready for dispatch'
  | 'Picked up'
  | 'Out for delivery'
  | 'Partially delivered'
  | 'Delivered'
  | 'Failed'
  | 'Returned to factory'
  | 'Rescheduled'
  | 'Needs review'
  | 'Cancelled'

/** How the request reached the portal — mobile (owner app, future) or web (phoned-in, logged via FERT-07). */
export type RequestOrigin = 'mobile' | 'web'

export type PaymentMethod = 'deduct' | 'cash' | 'bank'

export type PaymentStatus = 'Not due' | 'Pending deduction' | 'Deducted' | 'Unpaid' | 'Part paid' | 'Paid'

export type NoticeStatus = 'Queued' | 'Sent' | 'Stored, not delivered' | 'Failed' | 'Cancelled'

export type FailReason = 'owner_not_available' | 'road_not_passable' | 'owner_refused' | 'wrong_estate' | 'other'

export interface PaymentSummary {
  method: PaymentMethod
  /** Σ charges = delivered qty × the approval-time rate */
  amountOwedRs: number
  /** recovered by a processed settlement (deduct method) */
  recoveredRs: number
  /** cash / bank payments recorded by an officer */
  paidRs: number
  outstandingRs: number
  status: PaymentStatus
}

export interface DeliveryPhoto {
  label: 'Delivery photo' | 'Failed delivery photo'
  takenAt: string
  takenBy: string
  photoUrl?: string
}

/** One delivery attempt — the fertilizer flag on the estate's route stop. */
export interface DeliveryAttempt {
  id: number
  attemptNo: number
  scheduledDate: string
  routeId: number
  routeName: string
  /** before pickup: who runs the route that day (cover-aware); after: the pickup agent */
  agentId: number | null
  agentName: string | null
  covering: boolean
  /** handed over — the task now stays with this agent */
  pinned: boolean
  handoverQtyKg: number | null
  handoverBy: string | null
  handoverAt: string | null
  agentConfirmQtyKg: number | null
  agentConfirmedAt: string | null
  pickupMismatch: boolean
  outForDeliveryAt: string | null
  outcome: 'delivered' | 'partial' | 'failed' | null
  deliveredQtyKg: number | null
  shortfallReason: string | null
  ownerName: string | null
  ownerConfirmedAt: string | null
  photos: DeliveryPhoto[]
  failReason: FailReason | null
  failReasonLabel: string | null
  failNote: string | null
  recordedAt: string | null
  checkedInQtyKg: number | null
  checkedInBy: string | null
  checkedInAt: string | null
  cancelled: boolean
}

export interface FertilizerRequest {
  id: string
  orderRef: string | null
  estateId: string
  estateName: string
  routeId: number | null
  routeName: string | null
  item: string
  quantityKg: number
  requestedDate: string
  origin: RequestOrigin
  status: RequestStatus
  reason?: string
  /** Set once approved (may be < requested for a partial approval). */
  approvedQtyKg?: number
  deliveredQtyKg: number
  /** reason for a partial approval or rejection — shown to the owner */
  decisionReason?: string
  decidedBy?: string
  decidedOn?: string
  needsManager: boolean
  managerDecidedBy?: string
  managerDecidedOn?: string
  /** Rs./kg snapshotted at approval — never recalculated */
  ratePerKg: number | null
  /** stock currently promised to this request (server-computed) */
  committedKg: number
  payment: PaymentSummary
  attempt: DeliveryAttempt | null
  /** "Attempt 2 of 3" while a delivery is in play */
  attemptLabel: string | null
  pickupMismatch: boolean
  noticeStatus: NoticeStatus | null
}

export interface RequestEvent {
  at: string
  deviceAt: string | null
  actor: string
  actorRole: string
  action: string
  fromStatus: string | null
  toStatus: string | null
  note: string | null
}

export interface FertilizerRequestDetail extends FertilizerRequest {
  allocations: Array<{ batchId: string; lotNumber: string; expiryDate: string; qtyKg: number; state: 'active' | 'picked' | 'released' }>
  attempts: DeliveryAttempt[]
  timeline: RequestEvent[]
  charges: Array<{
    id: string
    deliveryId: number | null
    qtyKg: number
    ratePerKg: number
    totalRs: number
    method: PaymentMethod
    settlementId: string | null
    calculatedAt: string
  }>
  payments: Array<{ id: number; amountRs: number; paidOn: string; method: 'cash' | 'bank'; reference: string | null; recordedBy: string }>
  notices: Array<{ kind: string; status: NoticeStatus; createdAt: string; sentAt: string | null }>
  maxAttempts: number
  managerApprovalAboveKg: number
}

export interface FertilizerPrice {
  id: number
  item: string
  ratePerKg: number
  effectiveDate: string
  setBy: string
  current: boolean
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
