import { localAuthService } from './local/authService';
import type { AuthService } from './types';

export const authService: AuthService = localAuthService;

export type { AuthResult, AuthService, DemoAccount } from './types';
