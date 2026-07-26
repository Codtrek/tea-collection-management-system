/**
 * DB ↔ portal mapping for estate/advance/settlement status, plus the
 * `PublicEstate`/`PublicAdvance`/`PublicSettlement` shapes returned to the
 * portal. Mirrors `collections/collection-map.ts`'s DB→App pattern.
 */

export type DbEstateStatus = 'active' | 'inactive';
export type AppEstateStatus = 'Active' | 'Inactive';

export type DbAdvanceStatus = 'pending_deduction' | 'deducted';
export type AppAdvanceStatus = 'Pending deduction' | 'Deducted';

export type DbSettlementStatus = 'pending' | 'processed';
export type AppSettlementStatus = 'Pending' | 'Processed';

const DB_TO_APP_ESTATE_STATUS: Record<DbEstateStatus, AppEstateStatus> = {
  active: 'Active',
  inactive: 'Inactive',
};

const APP_TO_DB_ESTATE_STATUS: Record<AppEstateStatus, DbEstateStatus> = {
  Active: 'active',
  Inactive: 'inactive',
};

const DB_TO_APP_ADVANCE_STATUS: Record<DbAdvanceStatus, AppAdvanceStatus> = {
  pending_deduction: 'Pending deduction',
  deducted: 'Deducted',
};

const DB_TO_APP_SETTLEMENT_STATUS: Record<
  DbSettlementStatus,
  AppSettlementStatus
> = {
  pending: 'Pending',
  processed: 'Processed',
};

export function toAppEstateStatus(status: DbEstateStatus): AppEstateStatus {
  return DB_TO_APP_ESTATE_STATUS[status];
}

export function toDbEstateStatus(status: AppEstateStatus): DbEstateStatus {
  return APP_TO_DB_ESTATE_STATUS[status];
}

export function toAppAdvanceStatus(status: DbAdvanceStatus): AppAdvanceStatus {
  return DB_TO_APP_ADVANCE_STATUS[status];
}

export function toAppSettlementStatus(
  status: DbSettlementStatus,
): AppSettlementStatus {
  return DB_TO_APP_SETTLEMENT_STATUS[status];
}

/** 'EST-0001' — formatted from the estates.id serial, not stored directly. */
export function formatEstateId(id: number): string {
  return `EST-${String(id).padStart(4, '0')}`;
}

/** Inverse of `formatEstateId`. Throws (NaN) on a malformed id — caller turns that into a 404. */
export function parseEstateId(formatted: string): number {
  return Number(formatted.replace(/^EST-/, ''));
}

/* ── Portal-facing shapes — byte-identical to the portal's `features/estates/types.ts` ── */

export interface EstateBank {
  bank: string;
  branch: string;
  account: string;
}

export interface EstateDocument {
  name: string;
  uploadedOn: string;
}

export interface PublicEstate {
  id: string;
  estateName: string;
  ownerName: string;
  nic: string;
  contact: string;
  email?: string;
  location: string;
  address: string;
  route: string;
  selfDelivery: boolean;
  status: AppEstateStatus;
  ytdDeliveriesKg: number;
  bank: EstateBank;
  documents: EstateDocument[];
  lastUpdatedBy?: string;
  lastUpdatedOn?: string;
}

export interface PublicAdvance {
  id: string;
  estateId: string;
  estateName: string;
  amount: number;
  reason: string;
  dateIssued: string;
  issuedBy: string;
  status: AppAdvanceStatus;
}

export interface PublicSettlement {
  id: string;
  estateId: string;
  estateName: string;
  period: string;
  superKg: number;
  normalKg: number;
  superRate: number;
  normalRate: number;
  transportCost: number;
  fertilizerDeduction: number;
  advanceDeduction: number;
  status: AppSettlementStatus;
  selfDelivery: boolean;
  missingBank?: boolean;
  processedBy?: string;
  processedOn?: string;
}
