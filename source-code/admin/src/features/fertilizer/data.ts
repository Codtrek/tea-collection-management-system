import type { BatchStatus, FertilizerBatch, StockMovement } from './types'

/* Example stock — figures drawn from the module doc's example data. */

export const BATCHES: FertilizerBatch[] = [
  {
    id: 'FB-2291',
    item: 'Urea Fertilizer',
    quantityKg: 500,
    unit: 'kg',
    receivedDate: '2026-06-01',
    expiryDate: '2026-12-01',
    location: 'Warehouse A',
    supplier: 'CIC Agri Businesses',
    lotNumber: 'LOT-U-4471',
    qualityNotes: 'Sealed 50 kg bags, dry storage.',
    lastUpdatedBy: 'S. Fernando',
    lastUpdatedOn: '2026-07-12',
  },
  {
    id: 'FB-2287',
    item: 'NPK 20-20-20',
    quantityKg: 320,
    unit: 'kg',
    receivedDate: '2026-05-14',
    expiryDate: '2026-08-02',
    location: 'Warehouse A',
    supplier: 'Hayleys Agriculture',
    lotNumber: 'LOT-N-1183',
    lastUpdatedBy: 'S. Fernando',
    lastUpdatedOn: '2026-07-08',
  },
  {
    id: 'FB-2280',
    item: 'Dolomite',
    quantityKg: 150,
    unit: 'kg',
    receivedDate: '2026-04-02',
    expiryDate: '2026-07-24',
    location: 'Warehouse B',
    supplier: 'Lanka Minerals',
    lotNumber: 'LOT-D-0921',
    qualityNotes: 'Bags show minor moisture on outer layer — inspect before dispatch.',
  },
  {
    id: 'FB-2274',
    item: 'Muriate of Potash',
    quantityKg: 80,
    unit: 'kg',
    receivedDate: '2026-03-10',
    expiryDate: '2026-07-04',
    location: 'Warehouse B',
    supplier: 'CIC Agri Businesses',
    lotNumber: 'LOT-M-3350',
  },
  {
    id: 'FB-2268',
    item: 'Compost Blend',
    quantityKg: 0,
    unit: 'kg',
    receivedDate: '2026-02-01',
    expiryDate: '2026-06-01',
    location: 'Warehouse B',
    supplier: 'GreenGrow Organics',
    lotNumber: 'LOT-C-2210',
    discarded: true,
    lastUpdatedBy: 'A. Bandara',
    lastUpdatedOn: '2026-06-03',
  },
]

export const MOVEMENTS: StockMovement[] = [
  { id: 'MV-1101', batchId: 'FB-2291', type: 'Incoming', quantityKg: 500, date: '2026-06-01', supplier: 'CIC Agri Businesses', recordedBy: 'S. Fernando' },
  { id: 'MV-1108', batchId: 'FB-2291', type: 'Outgoing', quantityKg: 120, date: '2026-06-20', destination: 'Green Valley Estate', linkedRequest: 'FR-2026-0032', recordedBy: 'S. Fernando' },
  { id: 'MV-1112', batchId: 'FB-2291', type: 'Outgoing', quantityKg: 60, date: '2026-07-05', destination: 'Hilltop Estate', linkedRequest: 'FR-2026-0038', recordedBy: 'S. Fernando' },
  { id: 'MV-1103', batchId: 'FB-2287', type: 'Incoming', quantityKg: 400, date: '2026-05-14', supplier: 'Hayleys Agriculture', recordedBy: 'A. Bandara' },
  { id: 'MV-1109', batchId: 'FB-2287', type: 'Outgoing', quantityKg: 80, date: '2026-06-28', destination: 'Mount Rest Estate', linkedRequest: 'FR-2026-0035', recordedBy: 'S. Fernando' },
  { id: 'MV-1095', batchId: 'FB-2280', type: 'Incoming', quantityKg: 150, date: '2026-04-02', supplier: 'Lanka Minerals', recordedBy: 'S. Fernando' },
  { id: 'MV-1090', batchId: 'FB-2274', type: 'Incoming', quantityKg: 100, date: '2026-03-10', supplier: 'CIC Agri Businesses', recordedBy: 'A. Bandara' },
  { id: 'MV-1104', batchId: 'FB-2274', type: 'Outgoing', quantityKg: 20, date: '2026-05-30', destination: 'Green Valley Estate', linkedRequest: 'FR-2026-0029', recordedBy: 'S. Fernando' },
  { id: 'MV-1115', batchId: 'FB-2268', type: 'Outgoing', quantityKg: 90, date: '2026-06-03', destination: 'Disposal — expired stock', notes: 'Discarded past expiry.', recordedBy: 'A. Bandara' },
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
