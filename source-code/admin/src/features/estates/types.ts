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
  /** how the owner is paid — cash owners need no bank details */
  paymentMethod: OwnerPaymentMethod
  documents: Array<{ name: string; uploadedOn: string }>
  lastUpdatedBy?: string
  lastUpdatedOn?: string
}

export type OwnerPaymentMethod = 'bank' | 'cash'

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

/** EST-05 (Estate-Owner-Advances-Addendum §3) — balances from the server's estate-advance-balance.ts */
export type EstateAdvanceRecovery = 'Pending deduction' | 'Partly deducted' | 'Deducted'

export interface EstateAdvanceRow extends EstateAdvance {
  ownerName: string
  routeId: number | null
  route: string
  recovered: number
  remaining: number
  recovery: EstateAdvanceRecovery
}

export interface EstateAdvanceListResult extends PaginatedResult<EstateAdvanceRow> {
  summary: {
    /** issued in the range */
    issued: number
    issuedCount: number
    /** recovered by settlements processed in the range */
    deducted: number
    /** every remaining balance, any date */
    pendingDeduction: number
    pendingCount: number
  }
  routes: { id: number; name: string }[]
  issuers: string[]
}

export interface EstateAdvanceDetail {
  advance: EstateAdvanceRow
  recoveries: { settlementId: string; period: string; amount: number; recoveredAt: string }[]
  /** the estate's pending settlement carrying an advance deduction — planned, not yet recovered */
  planned: { settlementId: string; period: string; advanceDeduction: number } | null
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
  /** signed carry-over from approved grading corrections on already-settled deliveries (0 when none) */
  adjustment: number
  status: SettlementStatus
  selfDelivery: boolean
  /** excluded from a run and flagged, same exception pattern as payroll (UC-054) */
  missingBank?: boolean
  processedBy?: string
  processedOn?: string
}

/*
  Settlement period view (Settlement-Period-View-Addendum) — mirrors the backend's
  `settlement-view.ts`. Every figure, the summary and the filtering are server-side.
*/
export interface SettlementDeductions {
  fertilizer: number
  advances: number
  /** transport */
  other: number
}

export interface SettlementRow extends Settlement {
  month: string // 'YYYY-MM'
  ownerName: string
  routeId: number | null
  route: string
  paymentMethod: OwnerPaymentMethod
  gross: number
  deductions: SettlementDeductions
  deductionsTotal: number
  net: number
}

export interface SettlementSummary {
  month: string | null
  ownersSettled: number
  processed: number
  pending: number
  activeOwners: number
  gross: number
  deductions: SettlementDeductions
  deductionsTotal: number
  net: number
  notYetSettled: number | null
  latestMonth: string | null
}

export interface SettlementListResult {
  rows: SettlementRow[]
  page: number
  limit: number
  total: number
  hasMore: boolean
  summary: SettlementSummary
  months: string[]
  routes: { id: number; name: string }[]
}

export interface UnsettledOwner {
  estateId: string
  estateName: string
  ownerName: string
  route: string
  paymentMethod: OwnerPaymentMethod
  deliveries: number
  gradedKg: number
}

export interface SettlementDetail {
  settlement: SettlementRow
  deliveries: { id: string; date: string; superKg: number; normalKg: number; paid: boolean }[]
  fertilizerCharges: { id: string; date: string; quantityKg: number; ratePerKg: number; totalCharge: number; recovered: boolean }[]
  advances: { id: string; dateIssued: string; amount: number; reason: string; status: EstateAdvanceStatus }[]
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

/*
  EST-01 amended — the roster-wide directory row. Mirrors the backend's
  `EstateDirectoryRow` byte-for-byte; the same §3 rules apply (Confirmed
  deliveries, processed-only earnings, outstanding = charges − recovered),
  so these figures always agree with what EST-03's Lifetime Summary shows.
*/
export interface EstateDirectoryRow {
  id: string
  estateName: string
  ownerName: string
  route: string
  status: EstateStatus
  registeredOn: string
  tenureMonths: number
  ytdDeliveriesKg: number
  lastDeliveryDate: string | null
  lastPaymentRs: number | null
  lastPaymentDate: string | null
  outstandingRs: number
  hasOutstanding: boolean
  lifetimeEarnedRs: number
  lifetimeDeliveredKg: number
  superPct: number
  qualityTrend: Array<{ month: string; superPct: number }>
  documentCount: number
}

/*
  EST-03 amended — a Fertilizer tab row, one per dispatch charged to this
  estate. Mirrors the backend's `EstateFertilizerRecord` byte-for-byte. The
  Timeline's Fertilizer entries' `recordHref` deep-links to this tab.
*/
export interface EstateFertilizerRecord {
  id: string // 'FC-0001'
  date: string // ISO
  item: string
  quantityKg: number
  ratePerKg: number
  totalCharge: number
  /** null = outstanding, not yet recovered at a settlement. */
  settlementId: string | null
  /** formatted 'FR-2026-0001'; null for an ad-hoc dispatch. */
  requestId: string | null
  batchId: string | null // formatted 'FB-0001'
  lotNumber: string | null
}
