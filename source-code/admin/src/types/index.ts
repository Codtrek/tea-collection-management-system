/* Shared domain + auth types for the Harboost portal. */

export type Role = 'Administrator' | 'Officer' | 'Manager'

/** Modules that permissions gate against (mirrors the IA §3 groups). */
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
  | 'administration'

/** Ordered so that a higher level implies the lower ones. */
export type PermissionLevel = 'none' | 'view' | 'edit' | 'approve'

export interface User {
  id: string
  name: string
  role: Role
  /** users.phone — the DB's login identifier (rural mobile users, not email). */
  phone: string
  factory: string
  /** Data URL (mock) or Cloudinary URL (real backend); absent = initials fallback. */
  avatarUrl?: string
}

export type NotificationTone = 'success' | 'warning' | 'danger' | 'info'

export interface AppNotification {
  id: string
  tone: NotificationTone
  title: string
  time: string // ISO
  read: boolean
  /** notification type per master §15, used for filtering */
  type: string
  /** route to navigate to on click */
  href?: string
}
