import { UnauthorizedException } from '@nestjs/common';
import type { DbRole } from '../users/user.entity';
import { PORTAL_ROLES, type PortalRole } from '../admin/admin-map';

/** Roles the factory web portal's permission model (`AppRole`) is built around. */
export type AppRole = 'Administrator' | 'Officer' | 'Manager' | 'Estate Owner' | 'Estate Manager';

const DB_TO_APP_ROLE: Partial<Record<DbRole, AppRole>> = {
  factory_admin: 'Administrator',
  factory_officer: 'Officer',
  factory_manager: 'Manager',
  estate_owner: 'Estate Owner',
  estate_manager: 'Estate Manager'
};

/**
 * Maps a `users.role` DB value to the portal's `AppRole`. Only the three factory
 * roles may sign into the factory portal — estate/collector/employee roles belong
 * to the mobile app and are rejected here.
 */
export function toAppRole(dbRole: DbRole): AppRole {
  const appRole = DB_TO_APP_ROLE[dbRole];
  if (!appRole) {
    throw new UnauthorizedException(
      'This account cannot access the factory portal.',
    );
  }
  return appRole;
}

/**
 * Like `toAppRole`, but narrowed to the three factory-portal roles — for code
 * keyed on the portal permission model (`role_permissions`, ADM-02 users).
 */
export function toPortalRole(dbRole: DbRole): PortalRole {
  const appRole = toAppRole(dbRole);
  if (!(PORTAL_ROLES as string[]).includes(appRole)) {
    throw new UnauthorizedException(
      'This account cannot access the factory portal.',
    );
  }
  return appRole as PortalRole;
}

/** The three DB roles that own a factory-portal login, in display order. */
export const FACTORY_DB_ROLES: DbRole[] = [
  'factory_admin',
  'factory_officer',
  'factory_manager',
];

const PORTAL_TO_DB_ROLE: Record<PortalRole, DbRole> = {
  Administrator: 'factory_admin',
  Officer: 'factory_officer',
  Manager: 'factory_manager',
};

/** Portal role → `users.role` / `factory_employees.role`. */
export function toDbRole(role: PortalRole): 'factory_admin' | 'factory_officer' | 'factory_manager' {
  return PORTAL_TO_DB_ROLE[role] as 'factory_admin' | 'factory_officer' | 'factory_manager';
}
