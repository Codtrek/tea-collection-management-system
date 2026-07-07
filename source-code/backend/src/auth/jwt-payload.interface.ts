import { UserRole } from '../users/user.entity';

export interface JwtPayload {
  sub: number;
  phone: string;
  role: UserRole;
}
