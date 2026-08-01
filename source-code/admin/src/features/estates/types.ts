export type EstateStatus = 'Active' | 'Inactive'

export interface EstateOwner {
  id: string
  estateName: string
  ownerName: string
  nic: string
  contact: string
  email?: string
  location: string
  address: string
  /** system-assigned — never manually picked (locked architecture decision) */
  route: string
  /** exempt from transport cost deduction when true */
  selfDelivery: boolean
  status: EstateStatus
  ytdDeliveriesKg: number
  bank: { bank: string; branch: string; account: string }
  documents: Array<{ name: string; uploadedOn: string }>
  lastUpdatedBy?: string
  lastUpdatedOn?: string
}

export type EstateAdvanceStatus = 'Pending deduction' | 'Deducted'

export interface EstateAdvance {
  id: string
  estateId: string
  estateName: string
  amount: number
  reason: string
  dateIssued: string
  issuedBy: string
  status: EstateAdvanceStatus
}

export type SettlementStatus = 'Pending' | 'Processed'

/*
  Settlement per the proposal's payment formula:
  gross = Σ(grade weight × rate at collection time), less transport (waived on
  self-delivery), fertilizer dispatches (FERT-03 linked dispatches) and
  advances (EST-05). The ~Rs. 3 bank charge stays an unresolved open item —
  displayed as a note, never deducted until decided.
*/
export interface Settlement {
  id: string
  estateId: string
  estateName: string
  period: string
  superKg: number
  normalKg: number
  superRate: number
  normalRate: number
  transportCost: number
  fertilizerDeduction: number
  advanceDeduction: number
  status: SettlementStatus
  selfDelivery: boolean
  /** excluded from a run and flagged, same exception pattern as payroll (UC-054) */
  missingBank?: boolean
  processedBy?: string
  processedOn?: string
}
