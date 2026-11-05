import type { AppRole } from './role-map';

/** Portal (factory staff) token. */
export interface JwtPayload {
  /** users.id, as a string (JWT `sub` convention). */
  sub: string;
  role: AppRole;
}

/**
 * Mobile collection-agent token. Same signing secret, different `role` — the portal
 * strategy refuses it and the agent strategy refuses portal tokens, so neither
 * audience can call the other's API.
 */
export interface AgentJwtPayload {
  sub: string;
  role: 'CollectionAgent';
}

export const AGENT_ROLE = 'CollectionAgent' as const;
