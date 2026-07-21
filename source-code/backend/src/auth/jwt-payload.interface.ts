import type { AppRole } from './role-map';

export interface JwtPayload {
  /** users.id, as a string (JWT `sub` convention). */
  sub: string;
  role: AppRole;
}
