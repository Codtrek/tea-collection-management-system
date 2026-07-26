import { apiFetch } from '@/lib/api'
import type { EstateAdvance, EstateOwner, Settlement } from '@/features/estates/types'

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
