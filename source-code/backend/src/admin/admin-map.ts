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
  | 'itemPrices'
  | 'payRates'
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
  'itemPrices',
  'payRates',
  'dispatch',
  'grading',
  'gradingApproval',
  'fertilizerApproval',
  'fertilizerManagerApproval',
  'administration',
];

/**
 * Separation-of-duties keys (Users-Roles-Addendum §3). Everywhere else the Administrator is pinned
 * to `approve` (the factory always keeps one unrestricted account). On these the Administrator
 * audits: its cell may only be None or View, so it can never grant itself the duty it oversees.
 * - grading: an Officer grades; gradingApproval: a Manager approves corrections (Grading addendum)
 * - fertilizerApproval / fertilizerManagerApproval: Officer, then Manager above the limit
 *   (Fertilizer-Delivery-Addendum §4)
 * - expenses: Officers log, the Manager corrects (Finance-Reports-Addendum §7)
 */
export const SEPARATED_KEYS: ModuleKey[] = [
  'grading',
  'gradingApproval',
  'fertilizerApproval',
  'fertilizerManagerApproval',
  'expenses',
];

/** Levels the Administrator may hold on a separated key. */
export const SEPARATED_ADMIN_LEVELS: PermissionLevel[] = ['none', 'view'];

/** Keys that move money; any change to them needs a reason (as does any change touching `approve`). */
export const FINANCE_KEYS: ModuleKey[] = [
  'payroll',
  'advances',
  'estateOwners',
  'estateAdvances',
  'expenses',
  'itemPrices',
  'payRates',
  'reports',
];

export type CellLock = 'pinned' | 'capped' | null;

/**
 * Whether a matrix cell is locked: `pinned` = never editable (the Administrator's full access);
 * `capped` = editable only within SEPARATED_ADMIN_LEVELS. Server-enforced in updatePermissions.
 */
export function cellLock(role: PortalRole, module: ModuleKey): CellLock {
  if (role !== 'Administrator') return null;
  return SEPARATED_KEYS.includes(module) ? 'capped' : 'pinned';
}

export interface PermissionChange {
  role: PortalRole;
  module: ModuleKey;
  from: PermissionLevel;
  to: PermissionLevel;
}

/** A reason is required when any change touches an approval level or a finance key. */
export function needsReason(changes: PermissionChange[]): boolean {
  return changes.some(
    (c) =>
      c.from === 'approve' ||
      c.to === 'approve' ||
      FINANCE_KEYS.includes(c.module),
  );
}

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
  /** 'YYYY-MM' — the first month it charges */
  firstMonth: string;
  basis: 'per_km' | 'per_kg' | 'fixed_month';
  /** fixed_month: the monthly charge per estate */
  rate: number;
  minimumCharge: number;
  basisConfirmed: boolean;
  /** never charged (the seeded per-km placeholder) */
  neverApplied: boolean;
  /** the one-time first version that started in a past month */
  backdated: boolean;
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

export type SystemUserStatus = 'Active' | 'Inactive' | 'Locked';

/** Per-row action → null when allowed, else the reason it isn't (the portal disables + explains). */
export interface SystemUserActions {
  edit: string | null;
  changeRole: string | null;
  deactivate: string | null;
  reactivate: string | null;
  resetPassword: string | null;
  unlock: string | null;
}

export interface PublicSystemUser {
  id: string; // 'USR-0005'
  name: string;
  role: PortalRole;
  phone: string;
  email: string | null;
  status: SystemUserStatus;
  lastLogin: string | null; // ISO or null
  /** until when a Locked account stays locked (ISO) */
  lockedUntil: string | null;
  linkedEmployee: { id: number; name: string } | null;
  isSelf: boolean;
  actions: SystemUserActions;
}

export function formatUserId(id: number): string {
  return `USR-${String(id).padStart(4, '0')}`;
}

export function parseUserId(formatted: string): number {
  return Number(formatted.replace(/^USR-/, ''));
}
