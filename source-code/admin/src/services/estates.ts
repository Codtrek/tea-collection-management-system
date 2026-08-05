import { apiFetch } from '@/lib/api'
import type { CollectionRecord } from '@/features/collections/types'
import type {
  EstateAdvance,
  EstateAnalytics,
  EstateLifetimeMetrics,
  EstateOwner,
  PaginatedResult,
  Settlement,
  TimelinePage,
} from '@/features/estates/types'

export interface EstateInput {
  ownerName: string
  nic: string
  contact: string
  email?: string
  estateName: string
  address: string
  location: string
  selfDelivery: boolean
  bank: string
  branch: string
  account: string
}

export interface IssueAdvanceInput {
  estateId: string
  amount: number
  reason: string
}

export function list(): Promise<EstateOwner[]> {
  return apiFetch<EstateOwner[]>('/estates')
}

export function getById(id: string): Promise<EstateOwner> {
  return apiFetch<EstateOwner>(`/estates/${id}`)
}

export function create(input: EstateInput): Promise<EstateOwner> {
  return apiFetch<EstateOwner>('/estates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function update(id: string, input: EstateInput): Promise<EstateOwner> {
  return apiFetch<EstateOwner>(`/estates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deactivate(id: string): Promise<EstateOwner> {
  return apiFetch<EstateOwner>(`/estates/${id}/deactivate`, { method: 'PATCH' })
}

export function listAdvances(): Promise<EstateAdvance[]> {
  return apiFetch<EstateAdvance[]>('/estates/advances')
}

export function issueAdvance(input: IssueAdvanceInput): Promise<EstateAdvance> {
  return apiFetch<EstateAdvance>('/estates/advances', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function listSettlements(): Promise<Settlement[]> {
  return apiFetch<Settlement[]>('/estates/settlements')
}

export function processSettlements(): Promise<Settlement[]> {
  return apiFetch<Settlement[]>('/estates/settlements/process', { method: 'POST' })
}

/* ── Estate Owner Lifetime History (EST-03 amended + EST-10) ───────── */

export interface DateRangeQuery {
  from?: string
  to?: string
  page?: number
  limit?: number
}

function toQueryString(q: object): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(q as Record<string, string | number | undefined>)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

/** §3 — the shared selector every Lifetime Summary figure comes from. */
export function getLifetimeMetrics(id: string): Promise<EstateLifetimeMetrics> {
  return apiFetch<EstateLifetimeMetrics>(`/estates/${id}/lifetime`)
}

export interface TimelineQuery {
  type?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

/** §5 — the merged Delivery/Fertilizer/Settlement/Advance/Account feed. */
export function getTimeline(id: string, q: TimelineQuery = {}): Promise<TimelinePage> {
  return apiFetch<TimelinePage>(`/estates/${id}/timeline${toQueryString(q)}`)
}

/** §9 — EST-09 pre-scoped to this owner. */
export function getEstateAnalytics(id: string): Promise<EstateAnalytics> {
  return apiFetch<EstateAnalytics>(`/estates/${id}/analytics`)
}

/** §7 — paginated Deliveries tab, default window last 90 days. */
export function getDeliveries(
  id: string,
  q: DateRangeQuery = {},
): Promise<PaginatedResult<CollectionRecord>> {
  return apiFetch<PaginatedResult<CollectionRecord>>(`/estates/${id}/deliveries${toQueryString(q)}`)
}

/** §7 — paginated Payments tab, default window last 90 days. */
export function getPayments(id: string, q: DateRangeQuery = {}): Promise<PaginatedResult<Settlement>> {
  return apiFetch<PaginatedResult<Settlement>>(`/estates/${id}/payments${toQueryString(q)}`)
}

/** §7 — paginated Advances tab, default window last 90 days. */
export function getAdvancesFor(
  id: string,
  q: DateRangeQuery = {},
): Promise<PaginatedResult<EstateAdvance>> {
  return apiFetch<PaginatedResult<EstateAdvance>>(`/estates/${id}/advances${toQueryString(q)}`)
}
