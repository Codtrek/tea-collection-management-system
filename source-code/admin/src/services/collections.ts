import { apiFetch } from '@/lib/api'
import type {
  CollectionRecord,
  CorrectionRequest,
  GradeLine,
  GradeRevision,
  GradingContext,
} from '@/features/collections/types'

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

/**
 * Factory-side grading. The first save grades + confirms; while the delivery is OPEN the same call
 * edits it (a reason is then required). Only users with the `grading` permission can call it.
 */
export function setGradeLines(id: string, lines: GradeLine[], reason?: string): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/${id}/grade-lines`, {
    method: 'PUT',
    body: JSON.stringify({ lines, ...(reason ? { reason } : {}) }),
  })
}

/** End the OPEN window now (also releases the held notification to the estate owner). */
export function finalize(id: string): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/${id}/finalize`, { method: 'POST' })
}

export function getGradingContext(id: string): Promise<GradingContext> {
  return apiFetch<GradingContext>(`/collections/${id}/grading-context`)
}

export function listRevisions(id: string): Promise<GradeRevision[]> {
  return apiFetch<GradeRevision[]>(`/collections/${id}/revisions`)
}

export function listCorrections(id: string): Promise<CorrectionRequest[]> {
  return apiFetch<CorrectionRequest[]>(`/collections/${id}/corrections`)
}

/** LOCKED / SETTLED deliveries: new values + a required reason; a Manager approves. */
export function requestCorrection(id: string, lines: GradeLine[], reason: string): Promise<CorrectionRequest> {
  return apiFetch<CorrectionRequest>(`/collections/${id}/corrections`, {
    method: 'POST',
    body: JSON.stringify({ lines, reason }),
  })
}

export function approveCorrection(requestId: number, note?: string): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/corrections/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

export function rejectCorrection(requestId: number, note: string): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/corrections/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

/** Resend a failed owner notification. */
export function resendNotification(id: string): Promise<CollectionRecord> {
  return apiFetch<CollectionRecord>(`/collections/${id}/notification/resend`, { method: 'POST' })
}
