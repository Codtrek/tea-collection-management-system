/** Derived from expiry date — see batchStatus() in data.ts. */
export type BatchStatus = 'Fresh' | 'Expiring soon' | 'Expired' | 'Discarded'

export interface FertilizerBatch {
  id: string
  /** kept generic ("Item"), not hardcoded to fertilizer — beneficiary items may fold in later */
  item: string
  quantityKg: number
  unit: 'kg' | 'bags'
  receivedDate: string
  expiryDate: string
  location: string
  supplier: string
  lotNumber: string
  qualityNotes?: string
  discarded?: boolean
  lastUpdatedBy?: string
  lastUpdatedOn?: string
}

export type MovementType = 'Incoming' | 'Outgoing'

export interface StockMovement {
  id: string
  batchId: string
  type: MovementType
  quantityKg: number
  date: string
  /** Outgoing: Tea Estate Owner or Collection Agent receiving the stock */
  destination?: string
  /** Outgoing: approved fertilizer request this dispatch fulfils (UC-032/038) */
  linkedRequest?: string
  /** Incoming */
  supplier?: string
  notes?: string
  recordedBy: string
}
