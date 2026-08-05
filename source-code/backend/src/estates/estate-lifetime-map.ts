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
