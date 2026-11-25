import type { ModuleKey, PermissionLevel, Role } from '@/types'

/*
  Users & Roles: the one place a permission key gets a human name (Users-Roles-Addendum §3).
  The matrix, its review modal and the Profile page all read these labels. The lock and
  reason rules mirror the server's `admin-map.ts` (cellLock / needsReason); the server is the
  one that enforces them, this copy only explains them.
*/

export type PermissionSection = 'Operations' | 'Finance' | 'People' | 'Reports' | 'Administration'

export const SECTIONS: PermissionSection[] = ['Operations', 'Finance', 'People', 'Reports', 'Administration']

export interface PermissionKeyInfo {
  key: ModuleKey
  section: PermissionSection
  /** short plain-language name of what the key controls */
  label: string
  /** one line: what each level lets someone do here */
  description: string
}

/** Rows shown in the matrix, in section order. */
export const PERMISSION_CATALOG: PermissionKeyInfo[] = [
  // Operations
  {
    key: 'dashboard',
    section: 'Operations',
    label: 'Dashboard',
    description: 'See the home dashboard: work waiting for you, today’s figures and recent activity.',
  },
  {
    key: 'collection',
    section: 'Operations',
    label: 'Tea leaf collections',
    description: 'See collection records; Edit records provisional entries and changes.',
  },
  {
    key: 'dispatch',
    section: 'Operations',
    label: 'Agent dispatch',
    description: 'See the board; Edit covers absences and today-only changes; Approve changes routes permanently.',
  },
  {
    key: 'grading',
    section: 'Operations',
    label: 'Grade deliveries',
    description: 'Enter or change grade lines while a delivery is still open for grading.',
  },
  {
    key: 'gradingApproval',
    section: 'Operations',
    label: 'Approve grading corrections',
    description: 'Approve correction requests for deliveries whose grading window has closed.',
  },
  {
    key: 'fertilizer',
    section: 'Operations',
    label: 'Fertilizer stock and requests',
    description: 'See stock; Edit logs requests, dispatches and stock movements.',
  },
  {
    key: 'fertilizerApproval',
    section: 'Operations',
    label: 'Approve fertilizer requests',
    description: 'Approve an estate’s fertilizer request within the quantity limit.',
  },
  {
    key: 'fertilizerManagerApproval',
    section: 'Operations',
    label: 'Approve fertilizer requests above the quantity limit',
    description: 'The second sign-off a request needs when it is over the per-estate limit.',
  },
  // Finance
  {
    key: 'estateOwners',
    section: 'Finance',
    label: 'Estate owners and settlements',
    description: 'Owner records and their monthly settlements: Edit prepares, Approve processes.',
  },
  {
    key: 'estateAdvances',
    section: 'Finance',
    label: 'Estate owner advances',
    description: 'Issue, approve and reschedule advances to estate owners.',
  },
  {
    key: 'expenses',
    section: 'Finance',
    label: 'Daily expenses',
    description: 'Edit logs your own daily entries; Approve corrects anyone’s entry.',
  },
  {
    key: 'itemPrices',
    section: 'Finance',
    label: 'Fertilizer item prices',
    description: 'Publish new, effective-dated prices for fertilizer items.',
  },
  {
    key: 'payRates',
    section: 'Finance',
    label: 'Pay rates and pay changes',
    description: 'Edit prepares an effective-dated pay change; Approve puts it into force.',
  },
  {
    key: 'payroll',
    section: 'Finance',
    label: 'Payroll',
    description: 'See monthly payroll; Edit generates it; Approve processes it.',
  },
  {
    key: 'advances',
    section: 'Finance',
    label: 'Salary advances (employees)',
    description: 'See employee salary advances; Edit records requests and repayments; Approve decides them.',
  },
  // People
  {
    key: 'employees',
    section: 'People',
    label: 'Employee records',
    description: 'The HR roster: register, edit and deactivate employees.',
  },
  {
    key: 'attendance',
    section: 'People',
    label: 'Attendance and leave',
    description: 'See attendance; Edit marks attendance and leave; Approve signs off leave and past-day changes.',
  },
  {
    key: 'performance',
    section: 'People',
    label: 'Performance',
    description: 'See performance figures; Edit adds private notes from conversations with an employee.',
  },
  {
    key: 'holidayCalendar',
    section: 'People',
    label: 'Holiday calendar',
    description: 'Factory holidays and closures; Approve confirms changes others propose.',
  },
  {
    key: 'holidayStatutory',
    section: 'People',
    label: 'Poya and public holidays',
    description: 'Statutory holidays, holiday types and the calendar import.',
  },
  // Reports
  {
    key: 'reports',
    section: 'Reports',
    label: 'Reports',
    description: 'Collection, leaf purchase and expense reports.',
  },
  // Administration
  {
    key: 'administration',
    section: 'Administration',
    label: 'Factory administration',
    description: 'Factory setup, users and roles, system settings and the audit log.',
  },
]

export const ROLES: Role[] = ['Administrator', 'Manager', 'Officer']

/** Full level names — never abbreviated, never blank. */
export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: 'None',
  view: 'View',
  edit: 'Edit',
  approve: 'Approve',
}

export const LEVELS: PermissionLevel[] = ['none', 'view', 'edit', 'approve']

/** Mirrors the server's SEPARATED_KEYS: the Administrator audits these duties, so is capped at None/View. */
export const SEPARATED_KEYS: ModuleKey[] = [
  'grading',
  'gradingApproval',
  'fertilizerApproval',
  'fertilizerManagerApproval',
  'expenses',
]

export const SEPARATED_ADMIN_LEVELS: PermissionLevel[] = ['none', 'view']

/** Mirrors the server's FINANCE_KEYS (a change to any of them needs a reason). */
export const FINANCE_KEYS: ModuleKey[] = [
  'payroll',
  'advances',
  'estateOwners',
  'estateAdvances',
  'expenses',
  'itemPrices',
  'payRates',
  'reports',
]

export type CellLock = 'pinned' | 'capped' | null

export function cellLock(role: Role, key: ModuleKey): CellLock {
  if (role !== 'Administrator') return null
  return SEPARATED_KEYS.includes(key) ? 'capped' : 'pinned'
}

export const LOCK_REASONS: Record<Exclude<CellLock, null>, string> = {
  pinned:
    'Locked: the Administrator always keeps full access here, so the factory always has one unrestricted account.',
  capped:
    'Separation of duties: the Administrator checks this work, so its access can only be None or View. Give the duty to a Manager or Officer instead.',
}

/** The levels a cell's select may offer. */
export function allowedLevels(role: Role, key: ModuleKey): PermissionLevel[] {
  return cellLock(role, key) === 'capped' ? SEPARATED_ADMIN_LEVELS : LEVELS
}

export type Matrix = Partial<Record<Role, Partial<Record<ModuleKey, PermissionLevel>>>>

export interface MatrixChange {
  role: Role
  key: ModuleKey
  from: PermissionLevel
  to: PermissionLevel
}

/** A missing cell reads as None (it is shown as "None", never blank). */
export function levelAt(m: Matrix | null | undefined, role: Role, key: ModuleKey): PermissionLevel {
  return m?.[role]?.[key] ?? 'none'
}

/** Editable cells whose draft differs from the saved matrix, in catalog then role order. */
export function diffMatrix(saved: Matrix, draft: Matrix): MatrixChange[] {
  const out: MatrixChange[] = []
  for (const info of PERMISSION_CATALOG) {
    for (const role of ROLES) {
      if (cellLock(role, info.key) === 'pinned') continue
      const from = levelAt(saved, role, info.key)
      const to = levelAt(draft, role, info.key)
      if (from !== to) out.push({ role, key: info.key, from, to })
    }
  }
  return out
}

/** A reason is required when any change touches an approval level or a finance key. */
export function needsReason(changes: MatrixChange[]): boolean {
  return changes.some((c) => c.from === 'approve' || c.to === 'approve' || FINANCE_KEYS.includes(c.key))
}

export function labelOf(key: ModuleKey): string {
  return (
    PERMISSION_CATALOG.find((i) => i.key === key)?.label ??
    key
  )
}

/** "Officer · Daily expenses: View → Edit" */
export function describeChange(c: MatrixChange): string {
  return `${c.role} · ${labelOf(c.key)}: ${LEVEL_LABELS[c.from]} → ${LEVEL_LABELS[c.to]}`
}

/** Search by label, description or section. */
export function matchesSearch(info: PermissionKeyInfo, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return [info.label, info.description, info.section].some((t) => t.toLowerCase().includes(s))
}
