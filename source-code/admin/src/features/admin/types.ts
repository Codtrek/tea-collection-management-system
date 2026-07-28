/*
  ADM-01..04 contract — mirrors the backend's `admin-map.ts` / `audit-map.ts`
  Public* shapes. Kept here (not in the service) per the module recipe:
  delete the fixture, keep the types.
*/
import type { ModuleKey, PermissionLevel, Role } from '@/types'

export interface GradeRate {
  id: string
  superRate: number
  normalRate: number
  effectiveDate: string // 'YYYY-MM-DD'
  setBy: string
  current: boolean
}

export interface SystemUser {
  id: string // 'USR-0005'
  name: string
  role: Role
  phone: string
  status: 'Active' | 'Suspended'
  lastLogin: string | null // ISO or null
}

export interface AuditEntry {
  id: string
  timestamp: string // ISO
  user: string
  role: string
  action: string
  module: string
  record?: string
  recordHref?: string
  details?: string
}

export type PermissionMatrix = Record<Role, Record<ModuleKey, PermissionLevel>>

/** One flattened matrix cell — the shape the PUT endpoint validates. */
export interface PermissionEntry {
  role: Role
  module: ModuleKey
  level: PermissionLevel
}

/** Audit-log module filter values (match the backend's AuditModuleName). */
export const AUDIT_MODULES = [
  'Collection',
  'Estate Owner',
  'Fertilizer',
  'Employee',
  'Reports',
  'Administration',
] as const
