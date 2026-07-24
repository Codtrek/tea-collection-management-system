export interface EstateOwner {
  id: string
  estateName: string
  ownerName: string
  nic: string
  contact: string
  email?: string
  location: string
  address: string
  route: string
  selfDelivery: boolean
  status: 'Active' | 'Inactive'
  ytdDeliveriesKg: number
  bank: {
    bank: string
    branch: string
    account: string
  }
  documents: Array<{
    name: string
    uploadedOn: string
  }>
  lastUpdatedBy?: string
  lastUpdatedOn?: string
}

export interface EstateAdvance {
  id: string
  estateId: string
  estateName: string
  amount: number
  reason: string
  dateIssued: string
  issuedBy: string
  status: 'Pending deduction' | 'Deducted'
}

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
  status: 'Pending' | 'Processed'
  selfDelivery: boolean
  missingBank?: boolean
  processedBy?: string
  processedOn?: string
}