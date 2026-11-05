/**
 * Estate Owner Lifetime History slice (EST-03 amended + EST-10). Portal-facing
 * shapes for the lifetime summary, the merged timeline, and the per-estate
 * analytics tab. Mirrors the addendum's §3 `useEstateLifetimeMetrics` shape —
 * every figure here is computed server-side; the portal never sums a table.
 */

export interface EstateLifetimeMetrics {
  memberSince: string; // 'YYYY-MM-DD'
  tenureMonths: number;
  lifetime: {
    deliveredKg: number;
    earnedRs: number;
    fertilizerRs: number;
    fertilizerOrders: number;
    gradeSuperPct: number;
    gradeNormalPct: number;
    advancesRs: number;
  };
  outstanding: {
    fertilizerUndeductedRs: number;
    undeductedDispatchCount: number;
    lastSettlementRs: number | null;
    lastSettlementDate: string | null;
  };
  comparison: {
    deliveredVsAvgPct: number | null;
    qualityVsAvgPct: number | null;
  };
  disputes: {
    total: number;
    resolved: number;
    open: number;
  };
  routeHistory: Array<{ route: string; from: string; to: string | null }>;
}

export type TimelineEntryType =
  | 'Delivery'
  | 'Fertilizer'
  | 'Settlement'
  | 'Advance'
  | 'Account'
  | 'Registered';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  date: string; // ISO
  description: string;
  value?: number;
  recordHref?: string;
}

export interface TimelinePage {
  entries: TimelineEntry[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface EstateAnalytics {
  estateId: string;
  estateName: string;
  revenueTrend: Array<{ month: string; revenue: number }>;
  gradeSplit: { superPct: number };
  avgMonthlyKg: number;
  factoryAvgMonthlyKg: number;
  factoryAvgSuperPct: number;
  deliveredVsAvgPct: number | null;
}

export interface PaginatedResult<T> {
  rows: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * EST-01 amended — the roster-wide directory row. One grouped pass over the
 * same tables `lifetime()` reads per-estate (§3's rules apply here too:
 * deliveries Confirmed only, earnings processed-settlements only,
 * outstanding = Σ charges − Σ recovered), so the directory's figures always
 * agree with what EST-03 shows for the same estate — no separate math.
 */
export interface EstateDirectoryRow {
  id: string;
  estateName: string;
  ownerName: string;
  route: string;
  status: 'Active' | 'Inactive';
  registeredOn: string;
  tenureMonths: number;
  ytdDeliveriesKg: number;
  lastDeliveryDate: string | null;
  lastPaymentRs: number | null;
  lastPaymentDate: string | null;
  outstandingRs: number;
  hasOutstanding: boolean;
  lifetimeEarnedRs: number;
  lifetimeDeliveredKg: number;
  superPct: number;
  /** last 6 months, oldest first — feeds the Oversight view's sparkline. */
  qualityTrend: Array<{ month: string; superPct: number }>;
  documentCount: number;
}

/**
 * EST-03 amended — a Fertilizer tab row, one per dispatch charged to this
 * estate. Added so the Timeline's Fertilizer entries have somewhere of the
 * owner's own to link to, instead of the factory-wide batch page.
 */
export interface EstateFertilizerRecord {
  id: string; // 'FC-0001'
  date: string; // ISO — charge's calculatedAt
  item: string;
  quantityKg: number;
  ratePerKg: number;
  totalCharge: number;
  /** null = outstanding, not yet recovered at a settlement. */
  settlementId: string | null;
  /** formatted 'FR-2026-0001'; null for an ad-hoc dispatch. */
  requestId: string | null;
  batchId: string | null; // formatted 'FB-0001'
  lotNumber: string | null;
}
