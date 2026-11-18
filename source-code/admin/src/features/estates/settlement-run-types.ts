import type { OwnerPaymentMethod } from './types'

/*
  Settlement generator (Settlement-Addendum) — mirrors the backend's `settlement-generator.ts`
  and `settlement-generator.service.ts`. Every figure is calculated server-side; the portal only
  shows it. A processed settlement keeps the calculation it was processed with (`frozenAt`).
*/

export interface LeafLine {
  deliveryId: string
  date: string
  superKg: number
  normalKg: number
  superRate: number
  normalRate: number
  amount: number
  rolledIn: boolean
}

export interface RatePeriod {
  rateId: string
  from: string
  to: string
  superRate: number
  normalRate: number
  superKg: number
  normalKg: number
  superAmount: number
  normalAmount: number
  amount: number
  deliveries: number
  rolledIn: boolean
}

export interface TransportCalc {
  status: 'charged' | 'exempt' | 'no_deliveries' | 'not_configured'
  charge: number
  carriedIn: number
  due: number
  taken: number
  carriedOut: number
  versionId: number | null
  versionMonth: string | null
}

export interface FertilizerLine {
  chargeId: number
  ref: string
  date: string
  item: string
  quantityKg: number
  ratePerKg: number
  amount: number
  taken: number
  carried: number
  /** delivered before the system's first real month */
  checkSeed: boolean
}

export interface AdvanceLine {
  advanceId: string
  planned: number
  taken: number
  carried: number
}

export interface NotEligibleDelivery {
  id: string
  date: string
  status: string
  reason: string
}

export type DeductionStep = 'transport' | 'fertilizer' | 'advances'

export interface SettlementCalculation {
  version: number
  month: string
  period: string
  estateId: number
  estateName: string
  payoutMethod: OwnerPaymentMethod
  selfDelivery: boolean
  calculatedAt: string
  /** set when processed: the calculation is frozen from then on */
  frozenAt?: string
  leaf: LeafLine[]
  ratePeriods: RatePeriod[]
  superKg: number
  normalKg: number
  gross: number
  adjustments: { lines: { id: number; deliveryId: string; amount: number }[]; total: number }
  transport: TransportCalc
  fertilizer: { lines: FertilizerLine[]; info: FertilizerLine[]; due: number; taken: number; carried: number }
  advances: { lines: AdvanceLine[]; capPct: number; cap: number; due: number; taken: number; carried: number }
  order: DeductionStep[]
  deductionsTotal: number
  net: number
  carriedForward: number
  ungraded: NotEligibleDelivery[]
  open: NotEligibleDelivery[]
  excluded: NotEligibleDelivery[]
  blockers: string[]
  excludedReason: string | null
}

export interface RunTotals {
  estates: number
  superKg: number
  normalKg: number
  gross: number
  adjustments: number
  transport: number
  fertilizer: number
  advances: number
  deductions: number
  carriedForward: number
  net: number
}

export interface RunRow {
  settlementId: string | null
  status: 'Draft' | 'Not prepared'
  estateId: string
  estateName: string
  ownerName: string
  route: string
  payoutMethod: OwnerPaymentMethod
  calc: SettlementCalculation
  changedSincePrepared: boolean
  ready: boolean
  reasons: string[]
}

export interface SettlementRun {
  month: string
  period: string
  ratePeriods: { rateId: string; from: string; to: string; superRate: number; normalRate: number }[]
  transport: { configured: boolean; reason: string | null }
  candidates: number
  prepared: number
  processed: number
  notPrepared: number
  rows: RunRow[]
  waiting: { estateId: string; estateName: string; ungraded: number; open: number; excluded: number }[]
  legacy: { id: string; estateName: string; status: string; reason: string }[]
  /** the rows a Process run would take — the page's totals row AND the confirm popup */
  totals: RunTotals
}
