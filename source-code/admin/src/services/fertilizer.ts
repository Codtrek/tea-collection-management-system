import { apiFetch } from '@/lib/api'
import type { FertilizerBatch, FertilizerRequest, ItemPosition, MovementType, StockMovement } from '@/features/fertilizer/types'

export interface CreateBatchInput {
  item: string
  category: FertilizerBatch['category']
  quantityKg: number
  unit: FertilizerBatch['unit']
  receivedDate: string
  expiryDate: string
  location?: string
  supplier?: string
  lotNumber?: string
  qualityNotes?: string
}

export interface LogRequestInput {
  estateId: string
  item: string
  quantityKg: number
  reason?: string
}

export interface DecideRequestInput {
  decision: 'approve' | 'reject' | 'cancel'
  approvedQtyKg?: number
}

export interface RecordMovementInput {
  type: MovementType
  quantityKg: number
  date: string
  batchId?: string
  notes?: string
  // Incoming — new batch (omit batchId)
  item?: string
  category?: FertilizerBatch['category']
  unit?: FertilizerBatch['unit']
  supplier?: string
  lotNumber?: string
  expiryDate?: string
  // Outgoing
  destination?: string
  linkedRequest?: string
}

export function listBatches(): Promise<FertilizerBatch[]> {
  return apiFetch<FertilizerBatch[]>('/fertilizer/batches')
}

export function getBatch(id: string): Promise<FertilizerBatch> {
  return apiFetch<FertilizerBatch>(`/fertilizer/batches/${id}`)
}

export function createBatch(input: CreateBatchInput): Promise<FertilizerBatch> {
  return apiFetch<FertilizerBatch>('/fertilizer/batches', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function discardBatch(id: string): Promise<FertilizerBatch> {
  return apiFetch<FertilizerBatch>(`/fertilizer/batches/${id}/discard`, { method: 'PATCH' })
}

export function listPositions(): Promise<ItemPosition[]> {
  return apiFetch<ItemPosition[]>('/fertilizer/positions')
}

export function listRequests(): Promise<FertilizerRequest[]> {
  return apiFetch<FertilizerRequest[]>('/fertilizer/requests')
}

export function getRequest(id: string): Promise<FertilizerRequest> {
  return apiFetch<FertilizerRequest>(`/fertilizer/requests/${id}`)
}

export function logRequest(input: LogRequestInput): Promise<FertilizerRequest> {
  return apiFetch<FertilizerRequest>('/fertilizer/requests', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function decideRequest(id: string, input: DecideRequestInput): Promise<FertilizerRequest> {
  return apiFetch<FertilizerRequest>(`/fertilizer/requests/${id}/decide`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function listMovements(): Promise<StockMovement[]> {
  return apiFetch<StockMovement[]>('/fertilizer/movements')
}

export function recordMovement(input: RecordMovementInput): Promise<StockMovement> {
  return apiFetch<StockMovement>('/fertilizer/movements', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
