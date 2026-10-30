import type { BatchStatus, FertilizerBatch, FertilizerRequest, ItemPosition } from './types'

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

const isCommitting = (r: FertilizerRequest) => r.status === 'Approved' || r.status === 'Partially Dispatched'
const isLiveBatch = (item: string) => (b: FertilizerBatch) => b.item === item && batchStatus(b) !== 'Expired' && batchStatus(b) !== 'Discarded'

/** Undispatched remainder of an approved request. */
export function remainderOf(r: FertilizerRequest): number {
  return (r.approvedQtyKg ?? r.quantityKg) - (r.dispatchedQtyKg ?? 0)
}

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
  const want = req.status === 'Submitted' ? req.quantityKg : remainderOf(req)
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

/** Submitted requests awaiting a decision, oldest first (FERT-05 default order). */
export function pendingRequests(requests: FertilizerRequest[]): FertilizerRequest[] {
  return requests.filter((r) => r.status === 'Submitted').sort((a, b) => a.requestedDate.localeCompare(b.requestedDate))
}

/** Approved requests still awaiting dispatch — the FERT-02 "linked request" options. */
export function dispatchableRequests(requests: FertilizerRequest[]): FertilizerRequest[] {
  return requests.filter((r) => isCommitting(r) && remainderOf(r) > 0)
}

/** Mock settlement rate used to value committed stock (Rs/kg) for the FERT-01 card. */
export const RATE_PER_KG = 120

/** Committed kg / value / count for the FERT-01 "awaiting dispatch" card. */
export function committedSummary(requests: FertilizerRequest[]): { kg: number; valueRs: number; count: number } {
  const committed = requests.filter(isCommitting)
  const kg = committed.reduce((sum, r) => sum + remainderOf(r), 0)
  return { kg, valueRs: kg * RATE_PER_KG, count: committed.length }
}

/** Items whose available stock cannot meet their pending demand (FERT-01 card 1). */
export function itemsBelowDemand(positions: ItemPosition[]): ItemPosition[] {
  return positions.filter((p) => p.available < p.pendingDemand)
}

/** Per-item shortfall to fulfil already-approved commitments = negative available (FERT-01 card 4 + ShortfallPanel). */
export function shortfalls(positions: ItemPosition[]): { item: string; shortfallKg: number }[] {
  return positions.filter((p) => p.available < 0).map((p) => ({ item: p.item, shortfallKg: -p.available }))
}
