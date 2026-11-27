import type { AppRole } from './role-map';

/** Portal (factory staff) token. */
export interface JwtPayload {
  /** users.id, as a string (JWT `sub` convention). */
  sub: string;
  role: AppRole;
  /** `users.token_version` when the token was issued; a mismatch ends the session (portal only). */
  tv?: number;
}

/**
 * Mobile collection-agent token. Same signing secret, different `role` — the portal
 * strategy refuses it and the agent strategy refuses portal tokens, so neither
 * audience can call the other's API.
 */
export interface AgentJwtPayload {
  sub: string;
  role: 'CollectionAgent';
  /** `users.token_version` at issue; missing on tokens from before it existed (= 0). See agent-session.ts. */
  tv?: number;
  /** Issued-at (seconds), set by jsonwebtoken; drives the sliding refresh. */
  iat?: number;
}

export const AGENT_ROLE = 'CollectionAgent' as const;
