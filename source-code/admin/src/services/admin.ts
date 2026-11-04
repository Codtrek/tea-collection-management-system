import { apiFetch } from '@/lib/api'
import type {
  AuditEntry,
  GradeRate,
  PermissionEntry,
  PermissionMatrix,
  SystemUser,
} from '@/features/admin/types'

/* ── ADM-01 grade rates ─────────────────────────────────────────── */

export interface CreateGradeRateInput {
  superRate: number
  normalRate: number
  effectiveDate: string
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
