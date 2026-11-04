/**
 * DB ↔ portal mapping for the Fertilizer module. Mirrors `employees/employee-map.ts`:
 * shared string-enum aliases (DB CHECK constraints were written to match the
 * portal's types directly) plus id-formatting + Public-shape helpers.
 */

export type DbItemCategory = 'Fertilizer' | 'Beneficiary';
export type DbUnit = 'kg' | 'bags';
export type DbMovementType = 'Incoming' | 'Outgoing';
export type DbRequestOrigin = 'mobile' | 'web';
export type DbRequestStatus =
  | 'Submitted'
  | 'Approved'
  | 'Partially Dispatched'
  | 'Dispatched'
  | 'Deducted'
  | 'Rejected'
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

export interface PublicRequest {
  id: string;
  estateName: string;
  item: string;
  quantityKg: number;
  requestedDate: string;
  origin: DbRequestOrigin;
  status: DbRequestStatus;
  reason?: string;
  approvedQtyKg?: number;
  dispatchedQtyKg?: number;
  decidedBy?: string;
  decidedOn?: string;
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
