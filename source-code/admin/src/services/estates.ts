import { apiFetch } from '@/lib/api'
import type { CollectionRecord } from '@/features/collections/types'
import type {
  EstateAdvance,
  EstateAdvanceDetail,
  EstateAdvanceListResult,
  EstateAdvanceRecovery,
  EstateAnalytics,
  EstateDirectoryRow,
  EstateFertilizerRecord,
  EstateLifetimeMetrics,
  EstateOwner,
  OwnerPaymentMethod,
  PaginatedResult,
  Settlement,
  SettlementDetail,
  SettlementListResult,
  TimelinePage,
  UnsettledOwner,
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
  paymentMethod: OwnerPaymentMethod
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

/**
 * EST-01 amended — the roster-wide directory (money + tenure per owner, one
 * grouped backend pass). Distinct call from `list()` above: that one stays a
 * lightweight id+name fetch reused by several other screens' dropdowns.
 */
export function getDirectory(): Promise<EstateDirectoryRow[]> {
  return apiFetch<EstateDirectoryRow[]>('/estates/directory')
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

export interface EstateAdvanceQuery {
  search?: string
  routeId?: number
  status?: EstateAdvanceRecovery
  issuedBy?: string
  /** date issued, inclusive — advances still pending deduction show whatever the dates */
  from?: string
  to?: string
  page?: number
  limit?: number
}

export function listAdvances(q: EstateAdvanceQuery): Promise<EstateAdvanceListResult> {
  return apiFetch<EstateAdvanceListResult>(`/estates/advances${toQueryString(q)}`)
}

export function getAdvance(id: string): Promise<EstateAdvanceDetail> {
  return apiFetch<EstateAdvanceDetail>(`/estates/advances/${encodeURIComponent(id)}`)
}

export function issueAdvance(input: IssueAdvanceInput): Promise<EstateAdvance> {
  return apiFetch<EstateAdvance>('/estates/advances', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface SettlementQuery {
  month: string // 'YYYY-MM' | 'all'
  search?: string
  routeId?: number
  status?: string
  method?: string
  nonPositive?: boolean
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
  /** 0 = every filtered row (CSV export) */
  limit?: number
}

/** EST-07 period view — filtered, sorted and paged server-side; `summary` is the whole period. */
export function listSettlements(q: SettlementQuery): Promise<SettlementListResult> {
  return apiFetch<SettlementListResult>(`/estates/settlements${toQueryString(q)}`)
}

export function getSettlement(id: string): Promise<SettlementDetail> {
  return apiFetch<SettlementDetail>(`/estates/settlements/${encodeURIComponent(id)}`)
}

export function listUnsettledOwners(month: string): Promise<UnsettledOwner[]> {
  return apiFetch<UnsettledOwner[]>(`/estates/settlements/unsettled?month=${month}`)
}

/** EST-08 — processes the Pending settlements of one period ('July 2026'). */
export function processSettlements(period: string): Promise<Settlement[]> {
  return apiFetch<Settlement[]>('/estates/settlements/process', {
    method: 'POST',
    body: JSON.stringify({ period }),
  })
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
  for (const [key, value] of Object.entries(q as Record<string, string | number | boolean | undefined>)) {
    if (value !== undefined && value !== '' && value !== false) params.set(key, String(value))
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

/**
 * EST-03 amended — paginated Fertilizer tab, default window last 90 days.
 * The Timeline's Fertilizer entries' `recordHref` deep-links here.
 */
export function getFertilizerFor(
  id: string,
  q: DateRangeQuery = {},
): Promise<PaginatedResult<EstateFertilizerRecord>> {
  return apiFetch<PaginatedResult<EstateFertilizerRecord>>(`/estates/${id}/fertilizer${toQueryString(q)}`)
}
