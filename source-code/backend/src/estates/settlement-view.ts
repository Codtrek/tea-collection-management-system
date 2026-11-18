/**
 * Settlement period view (Settlement-Period-View-Addendum) — pure helpers, no repositories, so
 * every rule is unit-tested in settlement-view.spec.ts. Viewing only: the amounts come straight
 * from the stored settlement row and `settlementNet`; how a settlement is calculated is unchanged.
 */
import { labelToKey } from '../reports/reports-map';
import {
  type OwnerPaymentMethod,
  type PublicSettlement,
  settlementNet,
} from './estate-map';
import type { PaginatedResult } from './estate-lifetime-map';

export interface SettlementDeductions {
  fertilizer: number;
  advances: number;
  /** transport (the only other stored deduction) */
  other: number;
}

export interface SettlementRow extends PublicSettlement {
  /** 'YYYY-MM' of `period` — what the list sorts and filters on, never the label */
  month: string;
  ownerName: string;
  routeId: number | null;
  route: string;
  paymentMethod: OwnerPaymentMethod;
  gross: number;
  deductions: SettlementDeductions;
  deductionsTotal: number;
  net: number;
}

export interface SettlementSummary {
  /** 'YYYY-MM', or null for "All periods" */
  month: string | null;
  /** owners with a settlement row in the period (pending or processed) */
  ownersSettled: number;
  processed: number;
  pending: number;
  activeOwners: number;
  gross: number;
  deductions: SettlementDeductions;
  deductionsTotal: number;
  net: number;
  /** active owners with confirmed deliveries this month but no settlement row; null for all periods */
  notYetSettled: number | null;
  /** newest month that has any settlement — for the empty state's "View latest" */
  latestMonth: string | null;
}

export interface SettlementListResult extends PaginatedResult<SettlementRow> {
  /** always the WHOLE period, never the filtered rows — a filter is never read as the total */
  summary: SettlementSummary;
  /** every month that has a settlement, newest first (for the picker) */
  months: string[];
  routes: { id: number; name: string }[];
}

export type SettlementSort =
  | 'period'
  | 'estate'
  | 'gross'
  | 'deductions'
  | 'net';

export interface SettlementQuery {
  /** 'YYYY-MM' or 'all' */
  month: string;
  search?: string;
  routeId?: number;
  status?: 'Pending' | 'Processed';
  method?: OwnerPaymentMethod;
  /** only rows whose net payable is zero or negative */
  nonPositive?: boolean;
  sort?: SettlementSort;
  dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const ALL_PERIODS = 'all';

/** The owner/route/method facts a row needs from its estate. */
export interface EstateFacts {
  ownerName: string;
  routeId: number | null;
  route: string;
  paymentMethod: OwnerPaymentMethod;
  active: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function toSettlementRow(
  s: PublicSettlement,
  estate: EstateFacts | undefined,
): SettlementRow {
  const gross = round2(s.superKg * s.superRate + s.normalKg * s.normalRate);
  const deductions = {
    fertilizer: s.fertilizerDeduction,
    advances: s.advanceDeduction,
    other: s.transportCost,
  };
  return {
    ...s,
    month: labelToKey(s.period),
    ownerName: estate?.ownerName ?? 'Unknown',
    routeId: estate?.routeId ?? null,
    route: estate?.route ?? '',
    paymentMethod: estate?.paymentMethod ?? 'bank',
    gross,
    deductions,
    deductionsTotal: round2(
      deductions.fertilizer + deductions.advances + deductions.other,
    ),
    net: round2(
      settlementNet({
        ...s,
        adjustmentAmount: s.adjustment,
      }),
    ),
  };
}

/** Rows of the selected period (all of them for "All periods") — the summary's base. */
export function rowsInPeriod(
  rows: SettlementRow[],
  month: string,
): SettlementRow[] {
  return month === ALL_PERIODS ? rows : rows.filter((r) => r.month === month);
}

export function applyFilters(
  rows: SettlementRow[],
  q: SettlementQuery,
): SettlementRow[] {
  const needle = q.search?.trim().toLowerCase() ?? '';
  return rows.filter(
    (r) =>
      (!needle ||
        r.estateName.toLowerCase().includes(needle) ||
        r.ownerName.toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle)) &&
      (q.routeId === undefined || r.routeId === q.routeId) &&
      (!q.status || r.status === q.status) &&
      (!q.method || r.paymentMethod === q.method) &&
      (!q.nonPositive || r.net <= 0),
  );
}

/**
 * Newest period first by the REAL month (never the label — "September 2025" is not after
 * "July 2026"), then estate name. A chosen column sorts first, the period order breaks ties.
 */
export function sortRows(
  rows: SettlementRow[],
  sort: SettlementSort = 'period',
  dir: 'asc' | 'desc' = sort === 'period' ? 'desc' : 'asc',
): SettlementRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const byPeriod = (a: SettlementRow, b: SettlementRow) =>
    b.month.localeCompare(a.month) || a.estateName.localeCompare(b.estateName);
  const value = (r: SettlementRow): number | string => {
    switch (sort) {
      case 'gross':
        return r.gross;
      case 'deductions':
        return r.deductionsTotal;
      case 'net':
        return r.net;
      case 'estate':
        return r.estateName;
      default:
        return r.month;
    }
  };
  return [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av !== bv) {
      return (
        (typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))) * sign
      );
    }
    return byPeriod(a, b);
  });
}

/** Months that have a settlement, newest first. */
export function settledMonths(rows: SettlementRow[]): string[] {
  return [...new Set(rows.map((r) => r.month).filter(Boolean))]
    .sort()
    .reverse();
}

/**
 * Active estates that delivered (confirmed) in `month` and have no settlement row for it —
 * the "Owners not yet settled" list. Only confirmed deliveries count: they are the ones a
 * settlement pays for.
 */
export function unsettledEstateIds(
  estates: Map<number, EstateFacts>,
  deliveries: {
    estateId: number | null;
    status: string;
    collectionDate: string;
  }[],
  periodRows: SettlementRow[],
  month: string,
): number[] {
  const settled = new Set(periodRows.map((r) => r.estateId));
  const delivered = new Set<number>();
  for (const d of deliveries) {
    if (
      d.estateId !== null &&
      d.status === 'confirmed' &&
      d.collectionDate.slice(0, 7) === month
    ) {
      delivered.add(d.estateId);
    }
  }
  return [...delivered]
    .filter((id) => estates.get(id)?.active && !settled.has(formatId(id)))
    .sort((a, b) => a - b);
}

// settlements carry the formatted estate id ('EST-0001')
const formatId = (id: number) => `EST-${String(id).padStart(4, '0')}`;

export function summarize(
  periodRows: SettlementRow[],
  month: string,
  activeOwners: number,
  notYetSettled: number | null,
  latestMonth: string | null,
): SettlementSummary {
  const sum = (f: (r: SettlementRow) => number) =>
    round2(periodRows.reduce((s, r) => s + f(r), 0));
  const deductions = {
    fertilizer: sum((r) => r.deductions.fertilizer),
    advances: sum((r) => r.deductions.advances),
    other: sum((r) => r.deductions.other),
  };
  return {
    month: month === ALL_PERIODS ? null : month,
    ownersSettled: new Set(periodRows.map((r) => r.estateId)).size,
    processed: periodRows.filter((r) => r.status === 'Processed').length,
    pending: periodRows.filter((r) => r.status === 'Pending').length,
    activeOwners,
    gross: sum((r) => r.gross),
    deductions,
    deductionsTotal: round2(
      deductions.fertilizer + deductions.advances + deductions.other,
    ),
    net: sum((r) => r.net),
    notYetSettled,
    latestMonth,
  };
}

/** 0-based page of `limit` rows (limit 0 = every row, for the CSV export). */
export function paginate<T>(
  rows: T[],
  page = 0,
  limit = 25,
): PaginatedResult<T> {
  if (limit === 0) {
    return {
      rows,
      page: 0,
      limit: rows.length,
      total: rows.length,
      hasMore: false,
    };
  }
  const size = Math.min(100, Math.max(1, limit));
  const p = Math.max(0, page);
  const start = p * size;
  const pageRows = rows.slice(start, start + size);
  return {
    rows: pageRows,
    page: p,
    limit: size,
    total: rows.length,
    hasMore: start + pageRows.length < rows.length,
  };
}
