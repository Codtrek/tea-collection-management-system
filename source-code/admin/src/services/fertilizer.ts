import { apiFetch } from '@/lib/api'
import type {
  FailReason,
  FertilizerBatch,
  FertilizerPrice,
  FertilizerRequest,
  FertilizerRequestDetail,
  ItemPosition,
  MovementType,
  PaymentMethod,
  StockMovement,
} from '@/features/fertilizer/types'

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

/** FERT-07 — one order: one request per item, sharing an order reference. */
export interface CreateOrderInput {
  estateId: string
  items: Array<{ item: string; quantityKg: number }>
  paymentMethod: PaymentMethod
  reason?: string
}

/** Factory Officer. Partial approval and rejection need a reason (shown to the owner). */
export interface DecideRequestInput {
  decision: 'approve' | 'reject'
  approvedQtyKg?: number
  reason?: string
}

export type { FailReason }

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
  // Outgoing (ad-hoc only — a request's fertilizer leaves through its handover)
  destination?: string
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

export function getRequest(id: string): Promise<FertilizerRequestDetail> {
  return apiFetch<FertilizerRequestDetail>(`/fertilizer/requests/${id}`)
}

export function createOrder(input: CreateOrderInput): Promise<{ orderRef: string; requests: FertilizerRequestDetail[] }> {
  return apiFetch('/fertilizer/requests', { method: 'POST', body: JSON.stringify(input) })
}

const send = (path: string, method: 'POST' | 'PATCH', body?: unknown) =>
  apiFetch<FertilizerRequestDetail>(`/fertilizer/requests/${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

export const decideRequest = (id: string, input: DecideRequestInput) => send(`${id}/decide`, 'PATCH', input)
export const managerDecide = (id: string, input: { decision: 'approve' | 'reject'; reason?: string }) =>
  send(`${id}/manager-decide`, 'PATCH', input)
export const markReady = (id: string) => send(`${id}/ready`, 'POST')
export const changeDeliveryDate = (id: string, date: string, reason: string) =>
  send(`${id}/delivery-date`, 'PATCH', { date, reason })
export const recordHandover = (id: string, qtyKg: number) => send(`${id}/handover`, 'POST', { qtyKg })
export const checkIn = (id: string, qtyKg: number) => send(`${id}/check-in`, 'POST', { qtyKg })
export const retryDelivery = (id: string, date?: string) => send(`${id}/retry`, 'POST', date ? { date } : {})
export const releaseShortfall = (id: string, reason: string) => send(`${id}/release-shortfall`, 'POST', { reason })
export const cancelRequest = (id: string, reason: string) => send(`${id}/cancel`, 'POST', { reason })
export const setPaymentMethod = (id: string, method: PaymentMethod) => send(`${id}/payment-method`, 'PATCH', { method })
export const recordPayment = (
  id: string,
  input: { amount: number; paidOn: string; method: 'cash' | 'bank'; reference?: string },
) => send(`${id}/payments`, 'POST', input)

export function listPrices(): Promise<FertilizerPrice[]> {
  return apiFetch<FertilizerPrice[]>('/fertilizer/prices')
}

/** Administrator only. A new version — past prices are never edited. */
export function setPrice(input: { item: string; ratePerKg: number; effectiveDate: string }): Promise<FertilizerPrice[]> {
  return apiFetch<FertilizerPrice[]>('/fertilizer/prices', { method: 'POST', body: JSON.stringify(input) })
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
