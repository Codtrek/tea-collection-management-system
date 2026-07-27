import type { ModuleKey, PermissionLevel, Role } from '@/types'

/*
  Data-driven permission model (visual-foundations open-item #11).

  The §4 three-role model is only the DEFAULT. Real checks read this map rather
  than hardcoding `if (role === 'Officer')`, so when ADM-02 (Users & Roles) lets
  an Administrator customise privileges, only this table changes — no screen does.
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
