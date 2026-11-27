import { SetMetadata } from '@nestjs/common';
import type { ModuleKey, PermissionLevel } from '../admin/admin-map';

/**
 * Server-side permission checks on portal routes (Users-Roles-Addendum §4a). The portal's
 * `can()` reads the same `role_permissions` matrix; this makes the server enforce it, so a
 * hidden sidebar link is never the only protection.
 *
 * Every portal route handler carries exactly one of:
 *  - `@RequirePermission('payroll')` — the caller's role needs at least `view` on ANY listed key
 *    (several keys = a lookup shared by several pages), or the level given with `.level(...)`;
 *  - `@PortalOnly()` — any signed-in portal user (e.g. `/auth/me`).
 * `permissions.coverage.spec.ts` fails if a portal GET route has neither.
 */
export const PERMISSION_META = 'portal:permission';

export interface PermissionRequirement {
  /** Any one of these keys is enough. Empty = any signed-in portal user. */
  keys: ModuleKey[];
  level: Exclude<PermissionLevel, 'none'>;
}

export const LEVEL_ORDER: PermissionLevel[] = [
  'none',
  'view',
  'edit',
  'approve',
];

export function levelAtLeast(
  have: string | undefined | null,
  needed: PermissionLevel,
): boolean {
  const h = LEVEL_ORDER.indexOf((have ?? 'none') as PermissionLevel);
  return h >= 0 && h >= LEVEL_ORDER.indexOf(needed);
}

/** Needs `view` (default) on any of `keys`. */
export const RequirePermission = (...keys: [ModuleKey, ...ModuleKey[]]) =>
  SetMetadata(PERMISSION_META, {
    keys,
    level: 'view',
  } satisfies PermissionRequirement);

/** Needs `level` on any of `keys` (for writes, once they move to the matrix). */
export const RequirePermissionLevel = (
  level: Exclude<PermissionLevel, 'none'>,
  ...keys: [ModuleKey, ...ModuleKey[]]
) =>
  SetMetadata(PERMISSION_META, { keys, level } satisfies PermissionRequirement);

/** Any signed-in portal user; no matrix key. */
export const PortalOnly = () =>
  SetMetadata(PERMISSION_META, {
    keys: [],
    level: 'view',
  } satisfies PermissionRequirement);

export const SERVICE_CHECKED_META = 'portal:service-checked';

/**
 * A portal write whose permission check lives in its service, because it depends on more than a
 * key + level (a time window, the record's state, separated duties, Users & Roles rules). The
 * reason says which key / rule — the write coverage test requires it, so no write is unchecked
 * by accident (Users-Roles-Addendum §4a).
 */
export const ServiceChecked = (reason: string) =>
  SetMetadata(SERVICE_CHECKED_META, reason);

/** Human labels for the 403 message (mirrors the portal's permission-catalog labels). */
export const KEY_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  collection: 'Tea leaf collections',
  fertilizer: 'Fertilizer stock and requests',
  estateOwners: 'Estate owners and settlements',
  estateAdvances: 'Estate owner advances',
  holidayCalendar: 'Holiday calendar',
  holidayStatutory: 'Poya and public holidays',
  payroll: 'Payroll',
  advances: 'Salary advances',
  employees: 'Employee records',
  attendance: 'Attendance and leave',
  performance: 'Performance',
  reports: 'Reports',
  expenses: 'Daily expenses',
  itemPrices: 'Fertilizer item prices',
  payRates: 'Pay rates and pay changes',
  dispatch: 'Agent dispatch',
  grading: 'Grade deliveries',
  gradingApproval: 'Approve grading corrections',
  fertilizerApproval: 'Approve fertilizer requests',
  fertilizerManagerApproval:
    'Approve fertilizer requests above the quantity limit',
  administration: 'Factory administration',
};

/** Pure decision, shared by the guard and its tests. `null` = allowed, else the 403 message. */
export function permissionRefusal(
  req: PermissionRequirement,
  levels: Partial<Record<string, string>>,
): string | null {
  if (req.keys.length === 0) return null;
  if (req.keys.some((k) => levelAtLeast(levels[k], req.level))) return null;
  const what = req.keys.map((k) => KEY_LABELS[k] ?? k).join(' or ');
  const verb =
    req.level === 'view' ? 'view' : req.level === 'edit' ? 'change' : 'approve';
  return `Your role can't ${verb} ${what}. Ask your Factory Administrator if you need access.`;
}
