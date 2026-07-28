/**
 * ADM-04 — the audit trail's DB ↔ portal mapping. A single shared
 * `AuditService` writes one row per mutation across every module; the portal
 * (`AuditLogsPage`) renders these read-only. The `module` label is the
 * human-facing group name the portal already filters by, not the code module
 * name.
 */

/** Portal-facing module labels (match `AuditLogsPage`'s MODULES filter). */
export type AuditModuleName =
  | 'Collection'
  | 'Estate Owner'
  | 'Fertilizer'
  | 'Employee'
  | 'Reports'
  | 'Administration';

export interface PublicAuditEntry {
  id: string;
  timestamp: string; // ISO
  user: string;
  role: string;
  action: string;
  module: string;
  record?: string;
  recordHref?: string;
  details?: string;
}

/** 'AUD-00001' — formatted from a running sequence. */
export function formatAuditId(seq: number): string {
  return `AUD-${String(seq).padStart(5, '0')}`;
}
