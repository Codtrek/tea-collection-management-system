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
  | 'payroll'
  | 'advances'
  | 'employees'
  | 'attendance'
  | 'performance'
  | 'reports'
  | 'administration';

export const PORTAL_ROLES: PortalRole[] = ['Administrator', 'Officer', 'Manager'];

export const MODULE_KEYS: ModuleKey[] = [
  'dashboard',
  'collection',
  'fertilizer',
  'estateOwners',
  'payroll',
  'advances',
  'employees',
  'attendance',
  'performance',
  'reports',
  'administration',
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
  current: boolean;
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
