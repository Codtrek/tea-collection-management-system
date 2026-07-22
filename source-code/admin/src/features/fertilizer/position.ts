import { BATCHES, REQUESTS, batchStatus, daysToExpiry } from './data'
import type { CoverageStatus, FertilizerRequest, ItemPosition } from './types'

/*
  The single source of truth for the module's stock arithmetic (addendum §2, §5).
  Available = On hand − Committed. Computed ONLY here — no screen recalculates it,
  so the position table, the request queue's availability column, and the approval
  snapshot can never disagree.
*/

/** §5.4 coverage thresholds — configurable in one place (ADM-01 later), never hardcoded in a component. */
export const THRESHOLDS = { tightRatio: 0.5 }

/** Mock settlement rate used to value committed stock (Rs/kg) for the FERT-01 card. */
export const RATE_PER_KG = 120

/** Batches within this window are "expiring soon" — cannot reliably cover future dispatch. */
export const EXPIRING_SOON_DAYS = 30

const isLiveBatch = (item: string) => (b: (typeof BATCHES)[number]) =>
  b.item === item && batchStatus(b) !== 'Expired' && batchStatus(b) !== 'Discarded'

/** On hand = non-expired, non-discarded batches for an item. */
function onHandForItem(item: string): number {
  return BATCHES.filter(isLiveBatch(item)).reduce((sum, b) => sum + b.quantityKg, 0)
}

/** Committed = approved-but-not-fully-dispatched remainder. Approval commits stock (§4). */
function committedForItem(item: string): number {
  return REQUESTS.filter((r) => r.item === item && isCommitting(r)).reduce((sum, r) => sum + remainderOf(r), 0)
}

/** Pending demand = submitted (not yet approved). Advisory — does not reduce available. */
function pendingForItem(item: string): number {
  return REQUESTS.filter((r) => r.item === item && r.status === 'Submitted').reduce((sum, r) => sum + r.quantityKg, 0)
}

function isCommitting(r: FertilizerRequest): boolean {
  return r.status === 'Approved' || r.status === 'Partially Dispatched'
}

/** Undispatched remainder of an approved request. */
export function remainderOf(r: FertilizerRequest): number {
  return (r.approvedQtyKg ?? r.quantityKg) - (r.dispatchedQtyKg ?? 0)
}

export function availableForItem(item: string): number {
  return onHandForItem(item) - committedForItem(item)
}

function coverageStatus(available: number, pending: number): CoverageStatus {
  if (pending <= 0) return available < 0 ? 'Short' : 'Healthy'
  if (available >= pending) return 'Healthy'
  if (available >= pending * THRESHOLDS.tightRatio) return 'Tight'
  return 'Short'
}

/** Per-item positions — the FERT-01 table and summary cards read this. */
export function itemPositions(): ItemPosition[] {
  const items = [...new Set(BATCHES.map((b) => b.item))]
  return items.map((item) => {
    const category = BATCHES.find((b) => b.item === item)!.category
    const onHand = onHandForItem(item)
    const committed = committedForItem(item)
    const available = onHand - committed
    const pendingDemand = pendingForItem(item)
    return {
      item,
      category,
      onHand,
      committed,
      available,
      pendingDemand,
      coverageRatio: pendingDemand > 0 ? available / pendingDemand : null,
      status: coverageStatus(available, pendingDemand),
    }
  })
}

export type RequestAvailability = 'covered' | 'partial' | 'none' | 'covered-expiring'

/** Can this request be fulfilled right now? Evaluated at decision time (FERT-05/06). */
export function requestAvailability(req: FertilizerRequest): RequestAvailability {
  const available = availableForItem(req.item)
  const want = req.status === 'Submitted' ? req.quantityKg : remainderOf(req)
  if (available <= 0) return 'none'
  if (available < want) return 'partial'
  const leansOnExpiring = BATCHES.some(
    (b) => b.item === req.item && batchStatus(b) === 'Expiring soon' && daysToExpiry(b) >= 0,
  )
  return leansOnExpiring ? 'covered-expiring' : 'covered'
}

/** FEFO (first-expiring-first-out) allocation suggestion for a quantity of an item. */
export function fefoAllocation(item: string, qty: number): { batchId: string; take: number }[] {
  const batches = BATCHES.filter(isLiveBatch(item)).sort((a, b) => daysToExpiry(a) - daysToExpiry(b))
  const out: { batchId: string; take: number }[] = []
  let remaining = qty
  for (const b of batches) {
    if (remaining <= 0) break
    const take = Math.min(b.quantityKg, remaining)
    out.push({ batchId: b.id, take })
    remaining -= take
  }
  return out
}

/** Submitted requests awaiting a decision, oldest first (FERT-05 default order). */
export function pendingRequests(): FertilizerRequest[] {
  return REQUESTS.filter((r) => r.status === 'Submitted').sort((a, b) => a.requestedDate.localeCompare(b.requestedDate))
}

/** Approved requests still awaiting dispatch — the FERT-02 "linked request" options. */
export function dispatchableRequests(): FertilizerRequest[] {
  return REQUESTS.filter((r) => isCommitting(r) && remainderOf(r) > 0)
}

/** Committed kg / value / count for the FERT-01 "awaiting dispatch" card. */
export function committedSummary(): { kg: number; valueRs: number; count: number } {
  const committed = REQUESTS.filter(isCommitting)
  const kg = committed.reduce((sum, r) => sum + remainderOf(r), 0)
  return { kg, valueRs: kg * RATE_PER_KG, count: committed.length }
}

/** Items whose available stock cannot meet their pending demand (FERT-01 card 1). */
export function itemsBelowDemand(): ItemPosition[] {
  return itemPositions().filter((p) => p.available < p.pendingDemand)
}

/** Per-item shortfall to fulfil already-approved commitments = negative available (FERT-01 card 4 + ShortfallPanel). */
export function shortfalls(): { item: string; shortfallKg: number }[] {
  return itemPositions()
    .filter((p) => p.available < 0)
    .map((p) => ({ item: p.item, shortfallKg: -p.available }))
}
