import type { VersionStatus } from './versioning';
/**
 * DB ↔ portal mapping for the Administration module (ADM-01..03) plus the
 * shared permission-matrix vocabulary. These `ModuleKey`/`PermissionLevel`/
 * `PortalRole` types mirror the portal's `src/types` and `src/context/
 * permissions.ts` byte-for-byte — the matrix is exchanged over the wire, so
 * both ends must agree.
 */

export type PortalRole = 'Administrator' | 'Officer' | 'Manager';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'approve';

export type ModuleKey =
  | 'dashboard'
  | 'collection'
  | 'fertilizer'
  | 'estateOwners'
  | 'estateAdvances'
  | 'holidayCalendar'
  | 'holidayStatutory'
  | 'payroll'
  | 'advances'
  | 'employees'
  | 'attendance'
  | 'performance'
  | 'reports'
  | 'expenses'
  | 'dispatch'
  | 'grading'
  | 'gradingApproval'
  | 'fertilizerApproval'
  | 'fertilizerManagerApproval'
  | 'administration';

export const PORTAL_ROLES: PortalRole[] = [
  'Administrator',
  'Officer',
  'Manager',
];

export const MODULE_KEYS: ModuleKey[] = [
  'dashboard',
  'collection',
  'fertilizer',
  'estateOwners',
  'estateAdvances',
  'holidayCalendar',
  'holidayStatutory',
  'payroll',
  'advances',
  'employees',
  'attendance',
  'performance',
  'reports',
  'expenses',
  'dispatch',
  'grading',
  'gradingApproval',
  'fertilizerApproval',
  'fertilizerManagerApproval',
  'administration',
];

/**
 * Modules where the Administrator row IS editable. Every other module keeps the Administrator
 * pinned to `approve` (the factory always has one unrestricted account), but grading is a
 * separation-of-duties control: the Administrator audits it, an Officer grades, a Manager approves.
 */
export const ADMIN_EDITABLE_MODULES: ModuleKey[] = [
  'grading',
  'gradingApproval',
  // Fertilizer approval is the same kind of control: the Officer approves, a Manager signs off
  // above the limit, the Administrator audits (Fertilizer-Delivery-Addendum §4).
  'fertilizerApproval',
  'fertilizerManagerApproval',
  // Daily expenses (Finance-Reports-Addendum §7): Officers log, the Manager corrects, the
  // Administrator audits (view) and manages the category list.
  'expenses',
];

export type PermissionMatrix = Record<
  PortalRole,
  Record<ModuleKey, PermissionLevel>
>;

interface PermissionRow {
  role: string;
  module: string;
  level: string;
}

const isRole = (r: string): r is PortalRole =>
  (PORTAL_ROLES as string[]).includes(r);
const isModule = (m: string): m is ModuleKey =>
  (MODULE_KEYS as string[]).includes(m);

/** Fold `role_permissions` rows into the nested matrix the portal edits. */
export function rowsToMatrix(rows: PermissionRow[]): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const role of PORTAL_ROLES) {
    matrix[role] = {} as Record<ModuleKey, PermissionLevel>;
  }
  for (const r of rows) {
    if (isRole(r.role) && isModule(r.module)) {
      matrix[r.role][r.module] = r.level as PermissionLevel;
    }
  }
  return matrix;
}

/** The permission map for a single role — what login/`/auth/me` attaches. */
export function roleMapFromRows(
  rows: PermissionRow[],
  role: PortalRole,
): Record<ModuleKey, PermissionLevel> {
  const map = {} as Record<ModuleKey, PermissionLevel>;
  for (const r of rows) {
    if (r.role === role && isModule(r.module)) {
      map[r.module] = r.level as PermissionLevel;
    }
  }
  return map;
}

/* ── ADM-01 grade rates ───────────────────────────────────────────── */

export interface PublicGradeRate {
  id: string;
  superRate: number;
  normalRate: number;
  effectiveDate: string; // 'YYYY-MM-DD'
  setBy: string;
  reason: string | null;
  status: VersionStatus;
  /** in force today */
  current: boolean;
  /** starts after today (and not cancelled) */
  scheduled: boolean;
  cancelled: { at: string; by: string | null; reason: string | null } | null;
}

/* ── ADM-01 transport rates (Administration-Addendum §4) ─────────── */

export interface PublicTransportRate {
  id: number;
  effectiveDate: string;
  basis: 'per_km' | 'per_kg';
  rate: number;
  minimumCharge: number;
  basisConfirmed: boolean;
  setBy: string;
  reason: string | null;
  status: VersionStatus;
  cancelled: { at: string; by: string | null; reason: string | null } | null;
}

/* ── ADM-01 factory profile (Administration-Addendum §2) ─────────── */

export interface FactoryProfile {
  name: string;
  registrationNo: string;
  address: string;
  contact: string;
  email: string;
  bank: {
    bank: string;
    branch: string;
    accountName: string;
    accountNumber: string;
  };
}

/** What the portal gets: the account number masked to its last 4 digits. */
export interface PublicFactoryProfile extends Omit<FactoryProfile, 'bank'> {
  bank: {
    bank: string;
    branch: string;
    accountName: string;
    /** '••••1234', or '' when none is on record */
    accountNumberMasked: string;
  };
}

/** '••••1234' — never more than the last 4 digits leave the server. */
export function maskAccount(n: string): string {
  const digits = n.replace(/\s/g, '');
  return digits ? `••••${digits.slice(-4)}` : '';
}

/** 'GR-2026-0001' — embeds the effective year and a running sequence. */
export function formatGradeRateId(year: number, seq: number): string {
  return `GR-${year}-${String(seq).padStart(4, '0')}`;
}

/* ── ADM-02 system users ──────────────────────────────────────────── */

export interface PublicSystemUser {
  id: string; // 'USR-0005'
  name: string;
  role: PortalRole;
  phone: string;
  status: 'Active' | 'Suspended';
  lastLogin: string | null; // ISO or null
}

export function formatUserId(id: number): string {
  return `USR-${String(id).padStart(4, '0')}`;
}

export function parseUserId(formatted: string): number {
  return Number(formatted.replace(/^USR-/, ''));
}
