import { apiFetch } from '@/lib/api'
import type { CollectionRecord, GradeLine } from '@/features/collections/types'

/** COL-04: the ESTATE weight and date. Grade is never edited here — grading is factory-side. */
export interface UpdateCollectionInput {
  weightKg: number
  date: string
}

/**
 * COL-02, estate-first: the client sends only the estate it picked. The server derives the
 * route from the estate and today's agent from the route resolver (cover-aware).
 */
export interface CreateExceptionInput {
  /** `estates.id` (the numeric id behind 'EST-0002') */
  estateId: number
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

/** Factory-side grading at receiving: replaces the delivery's grade lines (one per grade) and confirms the record. */
export function setGradeLines(id: string, lines: GradeLine[]): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/${id}/grade-lines`, {
    method: 'PUT',
    body: JSON.stringify({ lines }),
  })
}

export function flag(id: string, reason: string): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/${id}/flag`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
