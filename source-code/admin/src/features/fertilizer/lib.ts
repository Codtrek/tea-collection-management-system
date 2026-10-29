import type { BatchStatus, FertilizerBatch, FertilizerRequest, ItemPosition, RequestStatus } from './types'

/*
  Pure, presentation-only helpers that operate on data already fetched from
  the backend (`src/services/fertilizer.ts`). Unlike the former `position.ts`,
  none of this recomputes stock arithmetic — on-hand/committed/available/
  coverage all come from `GET /fertilizer/positions` and are never
  recalculated here. What's left is genuinely derived from a single already-
  fetched record (expiry math, remainder) or a display-only suggestion
  (FEFO allocation) that never feeds back into the authoritative numbers.
*/

/** Days from today until the batch expires (negative when already past). */
export function daysToExpiry(batch: FertilizerBatch): number {
  return Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / 86_400_000)
}

/** Status derives from expiry so list and alerts can never disagree (§5). */
export function batchStatus(batch: FertilizerBatch): BatchStatus {
  if (batch.discarded) return 'Discarded'
  const days = daysToExpiry(batch)
  if (days < 0) return 'Expired'
  if (days <= 30) return 'Expiring soon'
  return 'Fresh'
}

const isLiveBatch = (item: string) => (b: FertilizerBatch) => b.item === item && batchStatus(b) !== 'Expired' && batchStatus(b) !== 'Discarded'

/** Looks up the server-computed `available` figure for an item — never recomputed client-side. */
export function availableForItem(item: string, positions: ItemPosition[]): number {
  return positions.find((p) => p.item === item)?.available ?? 0
}

export type RequestAvailability = 'covered' | 'partial' | 'none' | 'covered-expiring'

/** Can this request be fulfilled right now? Evaluated at decision time (FERT-05/06). */
export function requestAvailability(
  req: FertilizerRequest,
  positions: ItemPosition[],
  batches: FertilizerBatch[],
): RequestAvailability {
  const available = availableForItem(req.item, positions)
  const want = req.quantityKg
  if (available <= 0) return 'none'
  if (available < want) return 'partial'
  const leansOnExpiring = batches.some(
    (b) => b.item === req.item && batchStatus(b) === 'Expiring soon' && daysToExpiry(b) >= 0,
  )
  return leansOnExpiring ? 'covered-expiring' : 'covered'
}

/** FEFO (first-expiring-first-out) allocation suggestion for a quantity of an item — a display suggestion, not authoritative. */
export function fefoAllocation(
  item: string,
  qty: number,
  batches: FertilizerBatch[],
): { batchId: string; take: number }[] {
  const live = batches.filter(isLiveBatch(item)).sort((a, b) => daysToExpiry(a) - daysToExpiry(b))
  const out: { batchId: string; take: number }[] = []
  let remaining = qty
  for (const b of live) {
    if (remaining <= 0) break
    const take = Math.min(b.quantityKg, remaining)
    out.push({ batchId: b.id, take })
    remaining -= take
  }
  return out
}

/** Requests awaiting the Officer's decision, oldest first (FERT-05 default order). */
export function pendingRequests(requests: FertilizerRequest[]): FertilizerRequest[] {
  return requests.filter((r) => r.status === 'Requested').sort((a, b) => a.requestedDate.localeCompare(b.requestedDate))
}

/**
 * Committed kg / value / count for the FERT-01 "awaiting dispatch" card. Reads the
 * server-computed `committedKg` and the approval-time `ratePerKg` — nothing recomputed.
 */
export function committedSummary(requests: FertilizerRequest[]): { kg: number; valueRs: number; count: number } {
  const committed = requests.filter((r) => r.committedKg > 0)
  return {
    kg: committed.reduce((sum, r) => sum + r.committedKg, 0),
    valueRs: committed.reduce((sum, r) => sum + r.committedKg * (r.ratePerKg ?? 0), 0),
    count: committed.length,
  }
}

/** Items whose available stock cannot meet their pending demand (FERT-01 card 1). */
export function itemsBelowDemand(positions: ItemPosition[]): ItemPosition[] {
  return positions.filter((p) => p.available < p.pendingDemand)
}

/** Per-item shortfall to fulfil already-approved commitments = negative available (FERT-01 card 4 + ShortfallPanel). */
export function shortfalls(positions: ItemPosition[]): { item: string; shortfallKg: number }[] {
  return positions.filter((p) => p.available < 0).map((p) => ({ item: p.item, shortfallKg: -p.available }))
}

/* ── FERT-05 queue: tabs + filters, shared with FERT-06's "Next request" ── */

export const QUEUE_TABS = [
  { id: 'decide', label: 'To decide' },
  { id: 'approved', label: 'Approved' },
  { id: 'delivery', label: 'In delivery' },
  { id: 'review', label: 'Needs review' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
]

const ALL_STATUSES: RequestStatus[] = [
  'Requested',
  'Awaiting manager approval',
  'Approved',
  'Partially approved',
  'Ready for dispatch',
  'Picked up',
  'Out for delivery',
  'Partially delivered',
  'Failed',
  'Returned to factory',
  'Rescheduled',
  'Needs review',
  'Delivered',
  'Rejected',
  'Cancelled',
]

export const QUEUE_TAB_STATUSES: Record<string, RequestStatus[]> = {
  decide: ['Requested', 'Awaiting manager approval'],
  approved: ['Approved', 'Partially approved'],
  delivery: ['Ready for dispatch', 'Picked up', 'Out for delivery', 'Partially delivered', 'Failed', 'Returned to factory', 'Rescheduled'],
  review: ['Needs review'],
  closed: ['Delivered', 'Rejected', 'Cancelled'],
  all: ALL_STATUSES,
}

export interface QueueFilters {
  tab: string
  search: string
  status: string
  origin: string
}

/** The queue's filters live in the URL (`?tab=&q=&status=&origin=`), so going back keeps them. */
export function readQueueFilters(params: URLSearchParams): QueueFilters {
  const tab = params.get('tab') ?? ''
  return {
    tab: tab in QUEUE_TAB_STATUSES ? tab : 'decide',
    search: params.get('q') ?? '',
    status: params.get('status') ?? '',
    origin: params.get('origin') ?? '',
  }
}

export function queueParams(f: QueueFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.tab !== 'decide') p.set('tab', f.tab)
  if (f.search) p.set('q', f.search)
  if (f.status) p.set('status', f.status)
  if (f.origin) p.set('origin', f.origin)
  return p
}

/** The queue's rows in display order — oldest first while deciding (waiting longest), newest first elsewhere. */
export function queueRows(requests: FertilizerRequest[], f: QueueFilters): FertilizerRequest[] {
  const allowed = QUEUE_TAB_STATUSES[f.tab] ?? QUEUE_TAB_STATUSES.decide
  const q = f.search.trim().toLowerCase()
  return requests
    .filter(
      (r) =>
        allowed.includes(r.status) &&
        (!f.status || r.status === f.status) &&
        (!f.origin || r.origin === f.origin) &&
        (r.estateName.toLowerCase().includes(q) ||
          r.item.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.orderRef ?? '').toLowerCase().includes(q)),
    )
    .sort((a, b) =>
      f.tab === 'decide' ? a.requestedDate.localeCompare(b.requestedDate) : b.requestedDate.localeCompare(a.requestedDate),
    )
}

/**
 * The request to open after deciding `currentId`, in the queue's own order. A decided request
 * usually drops out of its tab, so then the queue's first row is the next one to work on.
 */
export function nextInQueue(rows: FertilizerRequest[], currentId: string): FertilizerRequest | null {
  const at = rows.findIndex((r) => r.id === currentId)
  if (at === -1) return rows[0] ?? null
  return rows[at + 1] ?? null
}
