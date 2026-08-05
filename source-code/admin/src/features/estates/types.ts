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

/*
  Estate Owner Lifetime History (EST-03 amended + EST-10) — mirrors the
  backend's `estate-lifetime-map.ts` byte-for-byte. Every figure here is
  computed server-side (addendum §3); no component sums a table for a total.
*/

export interface EstateLifetimeMetrics {
  memberSince: string // 'YYYY-MM-DD'
  tenureMonths: number
  lifetime: {
    deliveredKg: number
    earnedRs: number
    fertilizerRs: number
    fertilizerOrders: number
    gradeSuperPct: number
    gradeNormalPct: number
    advancesRs: number
  }
  outstanding: {
    fertilizerUndeductedRs: number
    undeductedDispatchCount: number
    lastSettlementRs: number | null
    lastSettlementDate: string | null
  }
  comparison: {
    deliveredVsAvgPct: number | null
    qualityVsAvgPct: number | null
  }
  disputes: {
    total: number
    resolved: number
    open: number
  }
  routeHistory: Array<{ route: string; from: string; to: string | null }>
}

export type TimelineEntryType = 'Delivery' | 'Fertilizer' | 'Settlement' | 'Advance' | 'Account' | 'Registered'

export interface TimelineEntry {
  id: string
  type: TimelineEntryType
  date: string // ISO
  description: string
  value?: number
  recordHref?: string
}

export interface TimelinePage {
  entries: TimelineEntry[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface EstateAnalytics {
  estateId: string
  estateName: string
  revenueTrend: Array<{ month: string; revenue: number }>
  gradeSplit: { superPct: number }
  avgMonthlyKg: number
  factoryAvgMonthlyKg: number
  factoryAvgSuperPct: number
  deliveredVsAvgPct: number | null
}

export interface PaginatedResult<T> {
  rows: T[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}
