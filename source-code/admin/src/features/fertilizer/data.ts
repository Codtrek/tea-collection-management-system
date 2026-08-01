import type { BatchStatus, FertilizerBatch, FertilizerRequest, StockMovement } from './types'

/*
  Example stock — figures drawn from the addendum's §5.2 example so the position
  table reproduces the spec's showcase (notably TSP available = −200 kg).
  Per-item on-hand across non-expired batches: Urea 1,200 · TSP 500 · MOP 300 ·
  Dolomite 800 · Rice 1,500.
*/
export const BATCHES: FertilizerBatch[] = [
  // Urea — 1,200 kg on hand
  { id: 'FB-2291', item: 'Urea Fertilizer', category: 'Fertilizer', quantityKg: 700, unit: 'kg', receivedDate: '2026-06-01', expiryDate: '2026-12-01', location: 'Warehouse A', supplier: 'CIC Agri Businesses', lotNumber: 'LOT-U-4471', qualityNotes: 'Sealed 50 kg bags, dry storage.', lastUpdatedBy: 'S. Fernando', lastUpdatedOn: '2026-07-12' },
  { id: 'FB-2292', item: 'Urea Fertilizer', category: 'Fertilizer', quantityKg: 500, unit: 'kg', receivedDate: '2026-06-20', expiryDate: '2026-11-15', location: 'Warehouse A', supplier: 'CIC Agri Businesses', lotNumber: 'LOT-U-4490', lastUpdatedBy: 'S. Fernando', lastUpdatedOn: '2026-07-14' },

  // TSP — 500 kg on hand (FB-2260 is expired, excluded from on-hand)
  { id: 'FB-2301', item: 'TSP', category: 'Fertilizer', quantityKg: 500, unit: 'kg', receivedDate: '2026-05-30', expiryDate: '2026-10-10', location: 'Warehouse A', supplier: 'Hayleys Agriculture', lotNumber: 'LOT-T-2201', lastUpdatedBy: 'S. Fernando', lastUpdatedOn: '2026-07-05' },
  { id: 'FB-2260', item: 'TSP', category: 'Fertilizer', quantityKg: 120, unit: 'kg', receivedDate: '2026-01-10', expiryDate: '2026-07-04', location: 'Warehouse B', supplier: 'Hayleys Agriculture', lotNumber: 'LOT-T-1180', qualityNotes: 'Past expiry — pending disposal.' },

  // MOP — 300 kg on hand, expiring soon (drives FEFO + expiring-cover)
  { id: 'FB-2274', item: 'Muriate of Potash', category: 'Fertilizer', quantityKg: 300, unit: 'kg', receivedDate: '2026-05-10', expiryDate: '2026-08-10', location: 'Warehouse B', supplier: 'CIC Agri Businesses', lotNumber: 'LOT-M-3350' },

  // Dolomite — 800 kg on hand
  { id: 'FB-2280', item: 'Dolomite', category: 'Fertilizer', quantityKg: 500, unit: 'kg', receivedDate: '2026-06-02', expiryDate: '2026-08-16', location: 'Warehouse B', supplier: 'Lanka Minerals', lotNumber: 'LOT-D-0921', qualityNotes: 'Bags show minor moisture on outer layer — inspect before dispatch.' },
  { id: 'FB-2281', item: 'Dolomite', category: 'Fertilizer', quantityKg: 300, unit: 'kg', receivedDate: '2026-06-25', expiryDate: '2026-11-01', location: 'Warehouse B', supplier: 'Lanka Minerals', lotNumber: 'LOT-D-0955' },

  // Rice — beneficiary item, 1,500 kg on hand
  { id: 'FB-2310', item: 'Rice', category: 'Beneficiary', quantityKg: 1500, unit: 'kg', receivedDate: '2026-07-01', expiryDate: '2027-03-01', location: 'Warehouse C', supplier: 'Govt Beneficiary Supply', lotNumber: 'LOT-R-7781' },
]

/*
  Fertilizer requests (addendum §4/§6). Approved rows commit stock; Submitted rows
  are advisory demand. Sums per item (approved / submitted):
  Urea 400/300 · TSP 700/200 → available −200 · MOP 100/400 · Rice 250/100.
*/
export const REQUESTS: FertilizerRequest[] = [
  // Approved — committed, awaiting dispatch
  { id: 'FR-2026-0140', estateName: 'Green Valley Estate', item: 'Urea Fertilizer', quantityKg: 400, requestedDate: '2026-07-10', origin: 'mobile', status: 'Approved', approvedQtyKg: 400, dispatchedQtyKg: 0, decidedBy: 'A. Bandara', decidedOn: '2026-07-12' },
  { id: 'FR-2026-0132', estateName: 'Hilltop Estate', item: 'TSP', quantityKg: 400, requestedDate: '2026-07-08', origin: 'mobile', status: 'Approved', approvedQtyKg: 400, dispatchedQtyKg: 0, decidedBy: 'A. Bandara', decidedOn: '2026-07-09' },
  { id: 'FR-2026-0135', estateName: 'Mount Rest Estate', item: 'TSP', quantityKg: 300, requestedDate: '2026-07-09', origin: 'mobile', status: 'Approved', approvedQtyKg: 300, dispatchedQtyKg: 0, decidedBy: 'A. Bandara', decidedOn: '2026-07-10' },
  { id: 'FR-2026-0138', estateName: 'Silver Peak Estate', item: 'Muriate of Potash', quantityKg: 100, requestedDate: '2026-07-11', origin: 'web', status: 'Approved', approvedQtyKg: 100, dispatchedQtyKg: 0, decidedBy: 'A. Bandara', decidedOn: '2026-07-12' },
  { id: 'FR-2026-0141', estateName: 'Green Valley Estate', item: 'Rice', quantityKg: 250, requestedDate: '2026-07-12', origin: 'mobile', status: 'Approved', approvedQtyKg: 250, dispatchedQtyKg: 0, decidedBy: 'A. Bandara', decidedOn: '2026-07-13' },

  // Submitted — pending approval (advisory demand)
  { id: 'FR-2026-0142', estateName: 'Green Valley Estate', item: 'Urea Fertilizer', quantityKg: 300, requestedDate: '2026-07-14', origin: 'mobile', status: 'Submitted', reason: 'Top dressing for the new flush.' },
  { id: 'FR-2026-0143', estateName: 'Hilltop Estate', item: 'TSP', quantityKg: 200, requestedDate: '2026-07-15', origin: 'mobile', status: 'Submitted', reason: 'Base fertiliser, lower field.' },
  { id: 'FR-2026-0144', estateName: 'Mount Rest Estate', item: 'Muriate of Potash', quantityKg: 400, requestedDate: '2026-07-16', origin: 'web', status: 'Submitted', reason: 'Phoned in — potassium deficiency flagged by manager.' },
  { id: 'FR-2026-0145', estateName: 'Silver Peak Estate', item: 'Rice', quantityKg: 100, requestedDate: '2026-07-18', origin: 'mobile', status: 'Submitted', reason: 'Monthly beneficiary ration.' },

  // Terminal / in-flight — queue variety, do not affect committed or pending
  { id: 'FR-2026-0128', estateName: 'Mount Rest Estate', item: 'Urea Fertilizer', quantityKg: 120, requestedDate: '2026-06-28', origin: 'mobile', status: 'Dispatched', approvedQtyKg: 120, dispatchedQtyKg: 120, decidedBy: 'A. Bandara', decidedOn: '2026-06-29' },
  { id: 'FR-2026-0130', estateName: 'Silver Peak Estate', item: 'TSP', quantityKg: 300, requestedDate: '2026-07-02', origin: 'web', status: 'Rejected', reason: 'Duplicate of FR-2026-0126.', decidedBy: 'A. Bandara', decidedOn: '2026-07-03' },
]

export const MOVEMENTS: StockMovement[] = [
  { id: 'MV-1101', batchId: 'FB-2291', type: 'Incoming', quantityKg: 700, date: '2026-06-01', supplier: 'CIC Agri Businesses', recordedBy: 'S. Fernando' },
  { id: 'MV-1108', batchId: 'FB-2291', type: 'Outgoing', quantityKg: 120, date: '2026-06-29', destination: 'Mount Rest Estate', linkedRequest: 'FR-2026-0128', recordedBy: 'S. Fernando' },
  { id: 'MV-1103', batchId: 'FB-2301', type: 'Incoming', quantityKg: 500, date: '2026-05-30', supplier: 'Hayleys Agriculture', recordedBy: 'A. Bandara' },
  { id: 'MV-1095', batchId: 'FB-2280', type: 'Incoming', quantityKg: 500, date: '2026-06-02', supplier: 'Lanka Minerals', recordedBy: 'S. Fernando' },
  { id: 'MV-1090', batchId: 'FB-2274', type: 'Incoming', quantityKg: 300, date: '2026-05-10', supplier: 'CIC Agri Businesses', recordedBy: 'A. Bandara' },
  { id: 'MV-1120', batchId: 'FB-2310', type: 'Incoming', quantityKg: 1500, date: '2026-07-01', supplier: 'Govt Beneficiary Supply', recordedBy: 'S. Fernando' },
  { id: 'MV-1085', batchId: 'FB-2260', type: 'Outgoing', quantityKg: 0, date: '2026-07-05', destination: 'Disposal — expired stock', notes: 'Flagged for disposal past expiry.', recordedBy: 'A. Bandara' },
]

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

export function movementsFor(batchId: string): StockMovement[] {
  return MOVEMENTS.filter((m) => m.batchId === batchId)
}

export function requestById(id: string): FertilizerRequest | undefined {
  return REQUESTS.find((r) => r.id === id)
}
