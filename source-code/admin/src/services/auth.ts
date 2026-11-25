import { apiFetch } from '@/lib/api'
import type { User } from '@/types'

export interface LoginResponse {
  accessToken: string
  user: User
  mustChangePassword?: boolean
}

export function login(phone: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
}

export function me(): Promise<User> {
  return apiFetch<User>('/auth/me')
}

/** Also replaces a temporary password; returns a fresh token (every other session is signed out). */
export function changePassword(currentPassword: string, newPassword: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}
