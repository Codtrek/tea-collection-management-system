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
    estateAdvances: 'approve',
    // Holidays (Attendance-Leave-Addendum §4): the Administrator approves holiday changes and owns
    // Poya / public holidays, type settings and the Google import (`holidayStatutory`).
    holidayCalendar: 'approve',
    holidayStatutory: 'approve',
    payroll: 'approve',
    advances: 'approve',
    employees: 'approve',
    attendance: 'approve',
    performance: 'approve',
    reports: 'approve',
    // Daily expense entries (Finance-Reports-Addendum §7): the Administrator views them and
    // manages the category list (Administration); entries are the Officer's and Manager's.
    expenses: 'view',
    // Item Prices (Administration-Addendum §5): the Administrator sets selling prices
    itemPrices: 'approve',
    // Pay Rates (Administration-Addendum §6–7): the Administrator approves pay changes
    payRates: 'approve',
    dispatch: 'approve',
    // Grading is a separation-of-duties control: an Officer grades, a Manager approves corrections,
    // the Administrator audits (view). `gradingApproval` is its own module because the `approve`
    // tier implies `edit` — a Manager can approve a correction without being able to grade.
    grading: 'view',
    gradingApproval: 'view',
    // Fertilizer approval is the same kind of control: the Officer approves, a Manager signs
    // off above the quantity limit, the Administrator audits (Fertilizer-Delivery-Addendum §4).
    fertilizerApproval: 'view',
    fertilizerManagerApproval: 'view',
    administration: 'approve',
  },
  Officer: {
    dashboard: 'view',
    collection: 'edit',
    fertilizer: 'edit',
    estateOwners: 'edit',
    estateAdvances: 'edit',
    holidayCalendar: 'view',
    holidayStatutory: 'view',
    payroll: 'edit',
    advances: 'approve',
    employees: 'view',
    attendance: 'edit',
    performance: 'none',  // Performance-Addendum: Manager + Administrator only, for now
    reports: 'edit',
    // edit = log a daily expense and change your own within the edit window
    expenses: 'edit',
    // reads the selling prices requests are approved at
    itemPrices: 'view',
    payRates: 'none',
    // Agent Dispatch: view the board · edit = mark absent / send cover · approve = permanent reassignment.
    dispatch: 'edit',
    grading: 'edit',
    gradingApproval: 'view',
    fertilizerApproval: 'approve',
    fertilizerManagerApproval: 'view',
    administration: 'none',
  },
  Manager: {
    dashboard: 'view',
    collection: 'view',
    fertilizer: 'view',
    estateOwners: 'view',
    estateAdvances: 'view',
    // edit = category holidays, rest days, emergency closures; weekly holiday + factory-wide closure as requests
    holidayCalendar: 'edit',
    holidayStatutory: 'view',
    payroll: 'view',
    advances: 'view',
    employees: 'view',
    // approve = older-than-window edits, with a reason (Attendance-Leave-Addendum)
    attendance: 'approve',
    performance: 'edit',  // view the measures + private notes
    reports: 'view',
    // approve = change any entry; after the creator's window, with a reason
    expenses: 'approve',
    itemPrices: 'view',
    // prepares pay changes; the Administrator approves
    payRates: 'edit',
    dispatch: 'approve',
    grading: 'view',
    gradingApproval: 'approve',
    fertilizerApproval: 'view',
    fertilizerManagerApproval: 'approve',
    administration: 'none',
  },
}

/** True when `have` meets or exceeds `required`. */
export function meets(have: PermissionLevel, required: PermissionLevel): boolean {
  return LEVEL_RANK[have] >= LEVEL_RANK[required]
}
