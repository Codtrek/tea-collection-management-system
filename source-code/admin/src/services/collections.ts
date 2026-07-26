import { apiFetch } from '@/lib/api'
import type { CollectionRecord, TeaGrade } from '@/features/collections/types'

export interface UpdateCollectionInput {
  weightKg: number
  date: string
  grade?: TeaGrade
}

export interface CreateExceptionInput {
  estateId: string
  estateName: string
  route: string
  agent?: string
  reportedWeight: number
  date: string
  reason: string
}

export function list(): Promise<CollectionRecord[]> {
  return apiFetch<CollectionRecord[]>('/collections')
}

export function getById(id: string): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/${id}`)
}

export function update(id: string, input: UpdateCollectionInput): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function createException(input: CreateExceptionInput): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>('/collections', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function flag(id: string, reason: string): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/${id}/flag`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
