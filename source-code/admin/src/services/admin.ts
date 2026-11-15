import { apiFetch } from '@/lib/api'
import type {
  AuditEntry,
  FactoryProfile,
  GradeRate,
  PermissionEntry,
  PermissionMatrix,
  SystemUser,
  TransportPreview,
  TransportRates,
} from '@/features/admin/types'

/* ── ADM-01 grade rates ─────────────────────────────────────────── */

export interface CreateGradeRateInput {
  superRate: number
  normalRate: number
  effectiveDate: string
  reason: string
}

export function getGradeRates(): Promise<GradeRate[]> {
  return apiFetch<GradeRate[]>('/admin/grade-rates')
}

export function createGradeRate(input: CreateGradeRateInput): Promise<GradeRate> {
  return apiFetch<GradeRate>('/admin/grade-rates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Cancel a scheduled version before it starts (reason required). */
export function cancelGradeRate(id: string, reason: string): Promise<GradeRate[]> {
  return apiFetch<GradeRate[]>(`/admin/grade-rates/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/* ── ADM-01 transport: a fixed monthly charge per estate (Administration-Addendum §4) ── */

export interface CreateTransportRateInput {
  /** Rs per estate per month */
  amount: number
  /** 'YYYY-MM' */
  effectiveMonth: string
  reason: string
}

/** "Last month this would have charged N estates, total Rs Y." */
export function previewTransportCharge(amount: number): Promise<TransportPreview> {
  return apiFetch<TransportPreview>(`/admin/transport-rates/preview?amount=${encodeURIComponent(String(amount))}`)
}

export function getTransportRates(): Promise<TransportRates> {
  return apiFetch<TransportRates>('/admin/transport-rates')
}

export function createTransportRate(input: CreateTransportRateInput): Promise<TransportRates> {
  return apiFetch<TransportRates>('/admin/transport-rates', { method: 'POST', body: JSON.stringify(input) })
}

export function cancelTransportRate(id: number, reason: string): Promise<TransportRates> {
  return apiFetch<TransportRates>(`/admin/transport-rates/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/* ── ADM-01 factory profile (Administration-Addendum §2) ────────── */

export interface UpdateFactoryProfileInput {
  name: string
  registrationNo: string
  address: string
  contact: string
  email: string
  bank: string
  branch: string
  accountName: string
  /** omit to keep the number on record */
  accountNumber?: string
}

export function getFactoryProfile(): Promise<FactoryProfile> {
  return apiFetch<FactoryProfile>('/admin/factory-profile')
}

export function updateFactoryProfile(input: UpdateFactoryProfileInput): Promise<FactoryProfile> {
  return apiFetch<FactoryProfile>('/admin/factory-profile', { method: 'PUT', body: JSON.stringify(input) })
}

/* ── ADM-02 permission matrix ───────────────────────────────────── */

export function getPermissionMatrix(): Promise<PermissionMatrix> {
  return apiFetch<PermissionMatrix>('/admin/permissions')
}

export function updatePermissions(entries: PermissionEntry[]): Promise<PermissionMatrix> {
  return apiFetch<PermissionMatrix>('/admin/permissions', {
    method: 'PUT',
    body: JSON.stringify({ entries }),
  })
}

/* ── ADM-02 system users ────────────────────────────────────────── */

export function getSystemUsers(): Promise<SystemUser[]> {
  return apiFetch<SystemUser[]>('/admin/users')
}

export function suspendUser(id: string): Promise<SystemUser> {
  return apiFetch<SystemUser>(`/admin/users/${id}/suspend`, { method: 'POST' })
}

export function resetPassword(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/admin/users/${id}/reset-password`, { method: 'POST' })
}

/* ── ADM-03 system settings ─────────────────────────────────────── */

export function getSettings(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/admin/settings')
}

export function updateSettings(
  settings: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  })
}

/* ── ADM-04 audit logs ──────────────────────────────────────────── */

export interface AuditFilters {
  module?: string
  user?: string
  search?: string
}

export function getAuditLogs(filters: AuditFilters = {}): Promise<AuditEntry[]> {
  const qs = new URLSearchParams()
  if (filters.module) qs.set('module', filters.module)
  if (filters.user) qs.set('user', filters.user)
  if (filters.search) qs.set('search', filters.search)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return apiFetch<AuditEntry[]>(`/audit${suffix}`)
}
