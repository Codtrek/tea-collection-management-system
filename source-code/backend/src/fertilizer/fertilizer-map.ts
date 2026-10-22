/**
 * DB ↔ portal mapping for the Fertilizer module. Mirrors `employees/employee-map.ts`:
 * shared string-enum aliases (DB CHECK constraints were written to match the
 * portal's types directly) plus id-formatting + Public-shape helpers.
 */

export type DbItemCategory = 'Fertilizer' | 'Beneficiary';
export type DbUnit = 'kg' | 'bags';
export type DbMovementType = 'Incoming' | 'Outgoing';
export type DbRequestOrigin = 'mobile' | 'web';

/**
 * Fertilizer-Delivery-Addendum §3. Stored exactly as shown (Title Case), like the old
 * lifecycle. 'Partially delivered' is the one status beyond the task's list: the owner took
 * part of the load and the agent still holds the rest until it's checked in.
 */
export type DbRequestStatus =
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
  | 'Cancelled';

export type PaymentMethod = 'deduct' | 'cash' | 'bank';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  deduct: 'Deduct from tea payment',
  cash: 'Cash',
  bank: 'Bank transfer',
};

export type FailReason =
  | 'owner_not_available'
  | 'road_not_passable'
  | 'owner_refused'
  | 'wrong_estate'
  | 'other';

export const FAIL_REASON_LABEL: Record<FailReason, string> = {
  owner_not_available: 'Owner not available',
  road_not_passable: 'Road not passable',
  owner_refused: 'Owner refused',
  wrong_estate: 'Wrong address / estate',
  other: 'Other',
};

export type AllocationState = 'active' | 'picked' | 'released';
export type DeliveryOutcome = 'delivered' | 'partial' | 'failed';

export type NotificationKind =
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'dispatched'
  | 'delivered'
  | 'failed'
  | 'cancelled';

/** Payment state shown on FERT-05/06 — derived by `paymentStatus()` in fertilizer-flow.ts, never stored. */
export type PaymentStatus =
  | 'Not due'
  | 'Pending deduction'
  | 'Deducted'
  | 'Unpaid'
  | 'Part paid'
  | 'Paid';

/** What the owner-notice column shows. "Stored, not delivered" = saved for the owner, no device to push to. */
export type NoticeStatus =
  | 'Queued'
  | 'Sent'
  | 'Stored, not delivered'
  | 'Failed'
  | 'Cancelled';

/** 'FB-0001' — formatted from fertilizer_batches.id, not stored directly. */
export function formatBatchId(id: number): string {
  return `FB-${String(id).padStart(4, '0')}`;
}

export function parseBatchId(formatted: string): number {
  return Number(formatted.replace(/^FB-/, ''));
}

/** 'MV-0001' — formatted from stock_movements.id. */
export function formatMovementId(id: number): string {
  return `MV-${String(id).padStart(4, '0')}`;
}

export function parseMovementId(formatted: string): number {
  return Number(formatted.replace(/^MV-/, ''));
}

/** 'FO-0001' — the shared reference of one order (one request per item). */
export function formatOrderRef(firstRequestId: number): string {
  return `FO-${String(firstRequestId).padStart(4, '0')}`;
}

/**
 * 'FR-2026-0001' — year taken from `createdAt` (cosmetic grouping, matching
 * the fixtures' look), numeric id from fertilizer_requests.id. Parsing only
 * needs the trailing numeric group — the year segment is ignored.
 */
export function formatRequestId(id: number, createdAt: Date): string {
  return `FR-${createdAt.getFullYear()}-${String(id).padStart(4, '0')}`;
}

export function parseRequestId(formatted: string): number {
  const match = /(\d+)$/.exec(formatted);
  return match ? Number(match[1]) : NaN;
}

/**
 * 'FC-0001' — formatted from fertilizer_charges.id. Added for the Estate
 * Owner Lifetime History slice's per-estate Fertilizer tab (EST-03) — the
 * charge, not the batch or request, is the row an owner's dispatch record
 * actually is, so it needs its own stable business key.
 */
export function formatChargeId(id: number): string {
  return `FC-${String(id).padStart(4, '0')}`;
}

export function parseChargeId(formatted: string): number {
  return Number(formatted.replace(/^FC-/, ''));
}

/* ── Portal-facing shapes — byte-identical to `features/fertilizer/types.ts` ── */

export interface PublicBatch {
  id: string;
  item: string;
  category: DbItemCategory;
  quantityKg: number;
  unit: DbUnit;
  receivedDate: string;
  expiryDate: string;
  location: string;
  supplier: string;
  lotNumber: string;
  qualityNotes?: string;
  discarded?: boolean;
  lastUpdatedBy?: string;
  lastUpdatedOn?: string;
}

export interface PublicMovement {
  id: string;
  batchId: string;
  type: DbMovementType;
  quantityKg: number;
  date: string;
  destination?: string;
  linkedRequest?: string;
  supplier?: string;
  notes?: string;
  recordedBy: string;
}

export interface PublicPaymentSummary {
  method: PaymentMethod;
  /** Σ charges (delivered qty × snapshot rate) */
  amountOwedRs: number;
  /** recovered by a processed settlement (deduct method) */
  recoveredRs: number;
  /** cash / bank payments recorded by an officer */
  paidRs: number;
  outstandingRs: number;
  status: PaymentStatus;
}

export interface PublicAttempt {
  id: number;
  attemptNo: number;
  scheduledDate: string;
  routeId: number;
  routeName: string;
  /** before pickup: who runs the route that day (cover-aware); after: the pickup agent */
  agentId: number | null;
  agentName: string | null;
  covering: boolean;
  /** true once handed over — the task then stays with this agent */
  pinned: boolean;
  handoverQtyKg: number | null;
  handoverBy: string | null;
  handoverAt: string | null;
  agentConfirmQtyKg: number | null;
  agentConfirmedAt: string | null;
  pickupMismatch: boolean;
  outForDeliveryAt: string | null;
  outcome: DeliveryOutcome | null;
  deliveredQtyKg: number | null;
  shortfallReason: string | null;
  ownerName: string | null;
  ownerConfirmedAt: string | null;
  photos: DeliveryPhoto[];
  failReason: FailReason | null;
  failReasonLabel: string | null;
  failNote: string | null;
  recordedAt: string | null;
  checkedInQtyKg: number | null;
  checkedInBy: string | null;
  checkedInAt: string | null;
  cancelled: boolean;
}

export interface DeliveryPhoto {
  label: 'Delivery photo' | 'Failed delivery photo';
  takenAt: string;
  takenBy: string;
  photoUrl?: string;
}

export interface PublicRequest {
  id: string;
  /** shared by the requests one phone call / order produced (one per item) */
  orderRef: string | null;
  estateId: string;
  estateName: string;
  routeId: number | null;
  routeName: string | null;
  item: string;
  quantityKg: number;
  requestedDate: string;
  origin: DbRequestOrigin;
  status: DbRequestStatus;
  reason?: string;
  /** set once approved (may be < requested for a partial approval) */
  approvedQtyKg?: number;
  deliveredQtyKg: number;
  /** reason for a partial approval or a rejection — shown to the owner */
  decisionReason?: string;
  decidedBy?: string;
  decidedOn?: string;
  /** approved above the limit → a Factory Manager also signs off */
  needsManager: boolean;
  managerDecidedBy?: string;
  managerDecidedOn?: string;
  /** Rs./kg snapshotted at approval; never recalculated */
  ratePerKg: number | null;
  /** stock currently promised to this request (active FEFO allocations) */
  committedKg: number;
  payment: PublicPaymentSummary;
  /** the latest delivery attempt, if any */
  attempt: PublicAttempt | null;
  /** "Attempt 2 of 3" while a delivery is in play; null before dispatch / after it ends */
  attemptLabel: string | null;
  /** an agent's pickup quantity differs from the officer's handover */
  pickupMismatch: boolean;
  /** status of the latest owner notice */
  noticeStatus: NoticeStatus | null;
}

export interface PublicAllocation {
  batchId: string;
  lotNumber: string;
  expiryDate: string;
  qtyKg: number;
  state: AllocationState;
}

export interface PublicRequestEvent {
  at: string;
  deviceAt: string | null;
  actor: string;
  actorRole: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
}

export interface PublicCharge {
  id: string;
  deliveryId: number | null;
  qtyKg: number;
  ratePerKg: number;
  totalRs: number;
  method: PaymentMethod;
  /** settlement that recovered it (deduct method); null = still pending */
  settlementId: string | null;
  calculatedAt: string;
}

export interface PublicPayment {
  id: number;
  amountRs: number;
  paidOn: string;
  method: 'cash' | 'bank';
  reference: string | null;
  recordedBy: string;
}

export interface PublicNotice {
  kind: NotificationKind;
  status: NoticeStatus;
  createdAt: string;
  sentAt: string | null;
}

export interface PublicRequestDetail extends PublicRequest {
  allocations: PublicAllocation[];
  attempts: PublicAttempt[];
  timeline: PublicRequestEvent[];
  charges: PublicCharge[];
  payments: PublicPayment[];
  notices: PublicNotice[];
  /** "Attempt n of N" — N from system_settings.fertilizer.maxDeliveryAttempts */
  maxAttempts: number;
  /** Officer-approval threshold from settings, so the UI can say when a Manager is needed */
  managerApprovalAboveKg: number;
}

export interface PublicPrice {
  id: number;
  item: string;
  ratePerKg: number;
  effectiveDate: string;
  setBy: string;
  /** the version in force today */
  current: boolean;
}

/** A fertilizer task on the agent's phone (`GET /dispatch/me/fertilizer`). */
export interface PublicAgentTask {
  deliveryId: number;
  requestId: string;
  orderRef: string | null;
  estateId: number;
  estateName: string;
  routeId: number;
  routeName: string;
  scheduledDate: string;
  item: string;
  /** what to take (before handover) or what he carries (after) */
  qtyKg: number;
  status: DbRequestStatus;
  /** awaiting_handover → the factory still has to hand it over; carrying → he has it */
  stage: 'awaiting_handover' | 'carrying';
  covering: boolean;
  handoverQtyKg: number | null;
  agentConfirmQtyKg: number | null;
}

export type CoverageStatus = 'Healthy' | 'Tight' | 'Short';

export interface PublicItemPosition {
  item: string;
  category: DbItemCategory;
  onHand: number;
  committed: number;
  available: number;
  pendingDemand: number;
  coverageRatio: number | null;
  status: CoverageStatus;
}
