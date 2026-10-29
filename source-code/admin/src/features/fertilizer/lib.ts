import { formatWeight } from '@/lib/format'
import type { BatchStatus, FertilizerBatch, FertilizerRequest, ItemPosition, RequestAvailability, RequestStatus } from './types'

/*
  Pure, presentation-only helpers over data already fetched from the backend
  (`src/services/fertilizer.ts`). Nothing here computes stock: On Hand, expired,
  committed, available, expiring-soon, item status, batch status and a request's
  availability (with its FEFO plan) all come from the backend's one stock-position
  service, so FERT-01, its cards, Expiry Alerts, FERT-05 and FERT-06 can't disagree.
  What's left only formats those figures for display.
*/

/** Days until the batch expires (negative once past) — server-computed on the factory calendar. */
export function daysToExpiry(batch: FertilizerBatch): number {
  return batch.daysToExpiry
}

/** Fresh / Expiring soon / Expired / Discarded — server-computed with the same window as FERT-01. */
export function batchStatus(batch: FertilizerBatch): BatchStatus {
  return batch.status
}

/** Looks up the server-computed `available` figure for an item — never recomputed client-side. */
export function availableForItem(item: string, positions: ItemPosition[]): number {
  return positions.find((p) => p.item === item)?.available ?? 0
}

/**
 * The first `qty` kg of the server's FEFO plan — a partial approval takes the same batches in
 * the same order, just less (a FEFO prefix is the FEFO plan for the smaller amount).
 */
export function fefoPrefix(plan: RequestAvailability['fefo'], qty: number): RequestAvailability['fefo'] {
  const out: RequestAvailability['fefo'] = []
  let left = qty
  for (const step of plan) {
    if (left <= 0) break
    const take = Math.min(step.take, left)
    out.push({ ...step, take })
    left -= take
  }
  return out
}

/** "12 Nov" — the short date the request labels use. */
export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** FERT-05/06 wording for a request's server verdict — "expiring" always names the batch and days left. */
export function availabilityLabel(
  a: RequestAvailability | null,
  quantityKg: number,
): { text: string; tone: 'success' | 'warning' | 'danger' } {
  if (!a) return { text: '—', tone: 'warning' }
  switch (a.verdict) {
    case 'covered':
      return { text: '✓ Covered', tone: 'success' }
    case 'covered-expiring': {
      const b = a.expiringBatch!
      const days = b.daysToExpiry === 0 ? 'today' : `${b.daysToExpiry} day${b.daysToExpiry === 1 ? '' : 's'}`
      return { text: `✓ Covered · uses batch expiring ${shortDate(b.expiryDate)} (${days})`, tone: 'warning' }
    }
    case 'partial':
      return { text: `⚠ ${formatWeight(Math.max(0, a.available))} of ${formatWeight(quantityKg)} free`, tone: 'warning' }
    case 'none-expired':
      return { text: '✕ Not available (stock expired)', tone: 'danger' }
    default:
      return { text: '✕ Not available', tone: 'danger' }
  }
}

/**
 * The Coverage column (Available ÷ Pending). Very large ratios read ">999%" instead of "4333%",
 * and the bar is drawn from the capped value; with nothing pending there's nothing to cover.
 */
export function coverageDisplay(ratio: number | null): { text: string; barPct: number | null } {
  if (ratio === null) return { text: 'No demand', barPct: null }
  const pct = ratio * 100
  return { text: pct > 999 ? '>999%' : `${Math.max(0, Math.round(pct))}%`, barPct: Math.min(100, Math.max(0, pct)) }
}

/** The FERT-01 badge text — "Short 77 kg" carries its amount. */
export function positionLabel(p: ItemPosition): string {
  return p.status === 'Short' ? `Short ${formatWeight(p.shortKg)}` : p.status
}

/** Committed kg / value (from positions) and how many requests hold it, for the FERT-01 card. */
export function committedSummary(positions: ItemPosition[], requests: FertilizerRequest[]): { kg: number; valueRs: number; count: number } {
  return {
    kg: positions.reduce((sum, p) => sum + p.committed, 0),
    valueRs: positions.reduce((sum, p) => sum + p.committedValueRs, 0),
    count: requests.filter((r) => r.committedKg > 0).length,
  }
}

/** Items whose pending requests can't all be met — the server status says so (FERT-01 card 1). */
export function itemsBelowDemand(positions: ItemPosition[]): ItemPosition[] {
  return positions.filter((p) => p.status === 'Out of stock' || p.status === 'Short')
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
