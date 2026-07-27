import { UnauthorizedException } from '@nestjs/common';
import type { DbRole } from '../users/user.entity';

/** Roles the factory web portal's permission model (`AppRole`) is built around. */
export type AppRole = 'Administrator' | 'Officer' | 'Manager';

const DB_TO_APP_ROLE: Partial<Record<DbRole, AppRole>> = {
  factory_admin: 'Administrator',
  factory_officer: 'Officer',
  factory_manager: 'Manager',
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
