import { apiFetch } from '@/lib/api'
import type { Role } from '@/types'
import type {
  AuditEntry,
  CreateSystemUserInput,
  EligibleEmployee,
  FactoryProfile,
  GradeRate,
  IssuedPassword,
  LinkSuggestion,
  PermissionEntry,
  PermissionMatrix,
  SystemUser,
  TransportPreview,
  TransportRates,
  UpdateSystemUserInput,
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

/** Only changed, editable cells; `reason` is required (server-checked) for approve / finance changes. */
export function updatePermissions(entries: PermissionEntry[], reason?: string): Promise<PermissionMatrix> {
  return apiFetch<PermissionMatrix>('/admin/permissions', {
    method: 'PUT',
    body: JSON.stringify({ entries, ...(reason ? { reason } : {}) }),
  })
}

/* ── ADM-02 system users (Users-Roles-Addendum §5) ──────────────── */

export function getSystemUsers(): Promise<SystemUser[]> {
  return apiFetch<SystemUser[]>('/admin/users')
}

export function getEligibleEmployees(): Promise<{ employees: EligibleEmployee[]; assignableRoles: Role[] }> {
  return apiFetch('/admin/users/eligible-employees')
}

export function getLinkSuggestions(): Promise<LinkSuggestion[]> {
  return apiFetch<LinkSuggestion[]>('/admin/users/link-suggestions')
}

export function createSystemUser(input: CreateSystemUserInput): Promise<IssuedPassword> {
  return apiFetch<IssuedPassword>('/admin/users', { method: 'POST', body: JSON.stringify(input) })
}

export function updateSystemUser(id: string, input: UpdateSystemUserInput): Promise<SystemUser> {
  return apiFetch<SystemUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deactivateUser(id: string, reason?: string): Promise<SystemUser> {
  return apiFetch<SystemUser>(`/admin/users/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })
}

export function reactivateUser(id: string): Promise<SystemUser> {
  return apiFetch<SystemUser>(`/admin/users/${id}/reactivate`, { method: 'POST' })
}

export function resetPassword(id: string): Promise<IssuedPassword> {
  return apiFetch<IssuedPassword>(`/admin/users/${id}/reset-password`, { method: 'POST' })
}

export function unlockUser(id: string): Promise<SystemUser> {
  return apiFetch<SystemUser>(`/admin/users/${id}/unlock`, { method: 'POST' })
}

export function linkUser(id: string, employeeId: number): Promise<SystemUser> {
  return apiFetch<SystemUser>(`/admin/users/${id}/link`, { method: 'POST', body: JSON.stringify({ employeeId }) })
}

export function unlinkUser(id: string): Promise<SystemUser> {
  return apiFetch<SystemUser>(`/admin/users/${id}/link`, { method: 'DELETE' })
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
