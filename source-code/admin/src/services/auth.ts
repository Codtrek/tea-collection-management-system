import { apiFetch } from '@/lib/api'
import type { User } from '@/types'

export interface LoginResponse {
  accessToken: string
  user: User
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
