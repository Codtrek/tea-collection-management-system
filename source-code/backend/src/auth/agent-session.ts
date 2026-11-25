import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { User } from '../users/user.entity';
import { AGENT_ROLE, type AgentJwtPayload } from './jwt-payload.interface';

/**
 * Mobile collection-agent sessions (Users-Roles-Addendum §4a).
 *
 * - A token lasts 30 days and slides: once it is more than a day old, every successful agent
 *   response carries a fresh 30-day token in `X-Session-Token` (AgentSessionInterceptor), which
 *   the app saves. An agent who uses the app at least once a month stays signed in, offline
 *   route days included.
 * - Like the portal, the token alone is never trusted: the user row is re-read on every request.
 *   A suspended login, or a token whose `tv` differs from `users.token_version`, is refused. The
 *   version is bumped on password change, deactivation and logout, so those end the session at
 *   once.
 * - Tokens issued before `tv` existed carry none; it counts as 0 (the column's default), so
 *   nobody is signed out by the deploy, and their first response upgrades them.
 */
export const AGENT_TOKEN_TTL = '30d';
/** A token older than this gets a fresh one on its next successful call. */
export const AGENT_REFRESH_AFTER_SECONDS = 24 * 60 * 60;
export const SESSION_TOKEN_HEADER = 'X-Session-Token';

/** Routes an agent with a temporary password may still call. */
export const AGENT_PASSWORD_CHANGE_PATHS = [
  '/auth/agent/change-password',
  '/auth/agent/logout',
];

export function checkAgentSession(
  user: Pick<
    User,
    'id' | 'role' | 'status' | 'token_version' | 'must_change_password'
  > | null,
  payload: AgentJwtPayload,
  path: string,
): AgentJwtPayload {
  if (payload.role !== AGENT_ROLE) {
    throw new UnauthorizedException(
      'This endpoint is for collection agents only.',
    );
  }
  if (!user || user.role !== 'collection_agent') {
    throw new UnauthorizedException('This login no longer exists.');
  }
  if (user.status === 'suspended') {
    throw new UnauthorizedException(
      'This login has been suspended. Contact your factory.',
    );
  }
  if ((payload.tv ?? 0) !== (user.token_version ?? 0)) {
    throw new UnauthorizedException(
      'Your session has ended. Please sign in again.',
    );
  }
  if (user.must_change_password) {
    const p = path.split('?')[0].replace(/\/+$/, '').toLowerCase();
    if (!AGENT_PASSWORD_CHANGE_PATHS.includes(p)) {
      throw new ForbiddenException('Change your temporary password first.');
    }
  }
  // `tv` from the DATABASE, so a refreshed token carries the version that was just checked.
  return {
    sub: String(user.id),
    role: AGENT_ROLE,
    tv: user.token_version ?? 0,
    iat: payload.iat,
  };
}

export function signAgentToken(
  jwt: JwtService,
  userId: number,
  tokenVersion: number,
): string {
  const payload: AgentJwtPayload = {
    sub: String(userId),
    role: AGENT_ROLE,
    tv: tokenVersion,
  };
  return jwt.sign(payload, { expiresIn: AGENT_TOKEN_TTL });
}

/** True when the (already validated) token is old enough to be renewed. */
export function needsRefresh(
  payload: Pick<AgentJwtPayload, 'iat'>,
  nowSeconds: number,
): boolean {
  return (
    typeof payload.iat === 'number' &&
    nowSeconds - payload.iat > AGENT_REFRESH_AFTER_SECONDS
  );
}
