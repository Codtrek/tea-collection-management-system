/*
  ADM-01..04 contract — mirrors the backend's `admin-map.ts` / `audit-map.ts`
  Public* shapes. Kept here (not in the service) per the module recipe:
  delete the fixture, keep the types.
*/
import type { ModuleKey, PermissionLevel, Role } from '@/types'

/** Every effective-dated version (Administration-Addendum §1). */
export type VersionStatus = 'current' | 'scheduled' | 'past' | 'cancelled'
export interface VersionCancelled {
  at: string
  by: string | null
  reason: string | null
}

export interface GradeRate {
  id: string
  superRate: number
  normalRate: number
  effectiveDate: string // 'YYYY-MM-DD'
  setBy: string
  reason: string | null
  status: VersionStatus
  /** in force today */
  current: boolean
  /** starts after today (and not cancelled) */
  scheduled: boolean
  cancelled: VersionCancelled | null
}

export type TransportBasis = 'per_km' | 'per_kg' | 'fixed_month'
/** One transport version (Administration-Addendum §4). Only `fixed_month` is charged. */
export interface TransportRate {
  id: number
  effectiveDate: string
  /** 'YYYY-MM' — the first month it charges */
  firstMonth: string
  basis: TransportBasis
  /** fixed_month: the monthly charge per estate */
  rate: number
  minimumCharge: number
  basisConfirmed: boolean
  /** never charged (the seeded per-km placeholder) */
  neverApplied: boolean
  /** the one-time first version that started in a past month */
  backdated: boolean
  setBy: string
  reason: string | null
  status: VersionStatus
  cancelled: VersionCancelled | null
}
export interface TransportRates {
  versions: TransportRate[]
  /** this month's status */
  status: { configured: boolean; reason: string | null }
  /** while no monthly charge exists: the earliest past month the first one may start from */
  firstVersionFrom: string | null
  /** the earliest month a normal version can start from */
  nextMonth: string
}
export interface TransportPreview {
  /** 'YYYY-MM' — last complete month */
  month: string
  estates: number
  total: number
  exempt: number
}

/** The factory's details. The account number never leaves the server in full. */
export interface FactoryProfile {
  name: string
  registrationNo: string
  address: string
  contact: string
  email: string
  bank: { bank: string; branch: string; accountName: string; accountNumberMasked: string }
}

export type SystemUserStatus = 'Active' | 'Inactive' | 'Locked'

/** Per-row action → null when allowed, else why not (server-computed; the UI disables and explains). */
export interface SystemUserActions {
  edit: string | null
  changeRole: string | null
  deactivate: string | null
  reactivate: string | null
  resetPassword: string | null
  unlock: string | null
}

export interface SystemUser {
  id: string // 'USR-0005'
  name: string
  role: Role
  phone: string
  email: string | null
  status: SystemUserStatus
  lastLogin: string | null // ISO or null
  lockedUntil: string | null
  linkedEmployee: { id: number; name: string } | null
  isSelf: boolean
  actions: SystemUserActions
}

/** HR employees who can be given a portal login (active, unlinked, not a collection agent). */
export interface EligibleEmployee {
  id: number
  name: string
  nic: string
  contact: string | null
  jobTitle: string
}

export interface LinkSuggestion {
  userId: string
  userName: string
  employeeId: number
  employeeName: string
  nic: string
}

/** The temporary password comes back exactly once; it is never stored or cached. */
export interface IssuedPassword {
  user: SystemUser
  temporaryPassword: string
}

export interface CreateSystemUserInput {
  employeeId: number
  role: Role
  phone?: string
  email?: string
}

export interface UpdateSystemUserInput {
  name?: string
  phone?: string
  email?: string
  role?: Role
  reason?: string
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
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  reason?: string
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
  'Dispatch',
  'Holidays',
  'Performance',
  'Administration',
] as const
