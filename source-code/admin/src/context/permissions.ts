import type { ModuleKey, PermissionLevel, Role } from '@/types'

/*
  Data-driven permission model (visual-foundations open-item #11).

  The §4 three-role model is only the DEFAULT. Real checks read this map rather
  than hardcoding `if (role === 'Officer')`.

  As of the Administration slice (2.6), the RUNTIME source of truth is the
  server's `role_permissions` table: login/`/auth/me` attach the user's role
  map onto `User.permissions`, and `AuthContext.level()` reads that first.
  This constant is now the FALLBACK default — used only when the backend didn't
  supply a map (older token, unseeded table) — and the seed for that table
  (backend `seed.ts` PERMISSION_MATRIX) is kept in sync with it.
*/

const LEVEL_RANK: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  approve: 3,
}

export type PermissionMatrix = Record<Role, Record<ModuleKey, PermissionLevel>>

export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  Administrator: {
    dashboard: 'approve',
    collection: 'approve',
    fertilizer: 'approve',
    estateOwners: 'approve',
    payroll: 'approve',
    advances: 'approve',
    employees: 'approve',
    attendance: 'approve',
    performance: 'approve',
    reports: 'approve',
    administration: 'approve',
  },
  Officer: {
    dashboard: 'view',
    collection: 'edit',
    fertilizer: 'edit',
    estateOwners: 'edit',
    payroll: 'edit',
    advances: 'approve',
    employees: 'view',
    attendance: 'edit',
    performance: 'view',
    // RPT-04 (log a daily expense) is a real write path once Reports is
    // backend-wired — Officer edits like every other module's `edit` tier,
    // Manager stays read-only (§4 three-role model).
    reports: 'edit',
    administration: 'none',
  },
  Manager: {
    dashboard: 'view',
    collection: 'view',
    fertilizer: 'view',
    estateOwners: 'view',
    payroll: 'view',
    advances: 'view',
    employees: 'view',
    attendance: 'view',
    performance: 'approve',
    reports: 'view',
    administration: 'none',
  },
}

/** True when `have` meets or exceeds `required`. */
export function meets(have: PermissionLevel, required: PermissionLevel): boolean {
  return LEVEL_RANK[have] >= LEVEL_RANK[required]
}
