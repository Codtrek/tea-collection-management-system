import type { User } from '@/types/user';

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };

export type DemoAccount = Pick<User, 'name' | 'phone' | 'role'>;

/**
 * Boundary between screens and data source. Today it's backed by local SQLite;
 * swap the implementation in services/index.ts for an HTTP client once the
 * backend API exists, without touching any screen code.
 */
export interface AuthService {
  login(phone: string, password: string): Promise<AuthResult>;
  getDemoAccounts(): Promise<DemoAccount[]>;
}
