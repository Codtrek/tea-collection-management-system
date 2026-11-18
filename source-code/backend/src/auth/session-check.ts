import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { User } from '../users/user.entity';
import type { JwtPayload } from './jwt-payload.interface';
import { FACTORY_DB_ROLES, toPortalRole } from './role-map';

/** Routes a user with a temporary password may still call (everything else → 403). */
export const PASSWORD_CHANGE_PATHS = ['/auth/me', '/auth/change-password'];

export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

/**
 * Per-request portal session check (Users-Roles-Addendum §6). The token alone is never trusted:
 * the user row is re-read on every request, so a deactivation, role change or password reset
 * (each bumps `token_version`) takes effect on the user's very next request, not at token expiry.
 * The role handed to controllers comes from the DATABASE, not the claim.
 */
export function checkPortalSession(
  user: Pick<
    User,
    'id' | 'role' | 'status' | 'token_version' | 'must_change_password'
  > | null,
  payload: JwtPayload,
  path: string,
): JwtPayload {
  if (!user) throw new UnauthorizedException('Account no longer exists.');
  if (user.status === 'suspended') {
    throw new UnauthorizedException('This account has been deactivated.');
  }
  if ((payload.tv ?? 0) !== (user.token_version ?? 0)) {
    throw new UnauthorizedException(
      'Your session has ended; please sign in again.',
    );
  }
  if (!FACTORY_DB_ROLES.includes(user.role)) {
    throw new UnauthorizedException(
      'This token cannot access the factory portal.',
    );
  }
  if (user.must_change_password) {
    const p = path.split('?')[0].replace(/\/+$/, '').toLowerCase();
    if (!PASSWORD_CHANGE_PATHS.includes(p)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: PASSWORD_CHANGE_REQUIRED,
        message: 'Change your temporary password to continue.',
      });
    }
  }
  return {
    sub: String(user.id),
    role: toPortalRole(user.role),
    tv: user.token_version ?? 0,
  };
}
