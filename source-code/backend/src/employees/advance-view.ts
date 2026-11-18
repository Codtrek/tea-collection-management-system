/**
 * Salary Advances list (Salary-Advances-Addendum) — tabs, date range, filters, sort and the
 * summary. Pure helpers, tested in advance-view.spec.ts. Recovery and remaining balance come
 * from advance-balance.ts (via `PublicAdvance`), never recomputed here.
 */
import type { PaginatedResult } from '../estates/estate-lifetime-map';
import { paginate } from '../estates/settlement-view';
import type { PublicAdvance } from './employee-map';
import type { RouteRef } from './employee-routes.service';

export type AdvanceTab = 'decide' | 'approved' | 'rejected' | 'all';
export type AdvanceSort = 'date' | 'amount' | 'employee' | 'remaining';

export interface AdvanceRow extends PublicAdvance {
  role: string;
  /** agents only: the routes they're responsible for today */
  routes: RouteRef[];
}

export interface AdvanceQuery {
  tab: AdvanceTab;
  /** 'YYYY-MM-DD', inclusive, on the request date — ignored by the "Needs decision" tab */
  from?: string;
  to?: string;
  search?: string;
  role?: string;
  routeId?: number;
  min?: number;
  max?: number;
  sort?: AdvanceSort;
  dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdvanceSummary {
  /** in the date range */
  requested: number;
  approved: number;
  /** every pending request, whatever the range — an old one is never hidden */
  pendingCount: number;
  /** every approved advance still to be recovered through payroll */
  outstanding: number;
}

export interface AdvanceListResult extends PaginatedResult<AdvanceRow> {
  summary: AdvanceSummary;
  /** the "Needs decision" tab's count, independent of the date range */
  tabCounts: Record<AdvanceTab, number>;
  roles: string[];
  routes: RouteRef[];
}

const TAB_STATUS: Record<AdvanceTab, PublicAdvance['status'] | null> = {
  decide: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  all: null,
};

export const inRange = (date: string, from?: string, to?: string) =>
  (!from || date >= from) && (!to || date <= to);

/** Rows in the date range — EXCEPT pending ones, which always show on "Needs decision". */
export function rowsForTab(rows: AdvanceRow[], q: AdvanceQuery): AdvanceRow[] {
  const status = TAB_STATUS[q.tab];
  return rows.filter(
    (r) =>
      (status === null || r.status === status) &&
      (q.tab === 'decide' || inRange(r.dateRequested, q.from, q.to)),
  );
}

export function applyAdvanceFilters(
  rows: AdvanceRow[],
  q: AdvanceQuery,
): AdvanceRow[] {
  const needle = q.search?.trim().toLowerCase() ?? '';
  return rows.filter(
    (r) =>
      (!needle ||
        r.employeeName.toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle) ||
        r.employeeId.toLowerCase().includes(needle)) &&
      (!q.role || r.role === q.role) &&
      (q.routeId === undefined || r.routes.some((x) => x.id === q.routeId)) &&
      (q.min === undefined || r.amount >= q.min) &&
      (q.max === undefined || r.amount <= q.max),
  );
}

/** Oldest first on "Needs decision" (first come, first decided), newest first elsewhere. */
export function sortAdvances(
  rows: AdvanceRow[],
  tab: AdvanceTab,
  sort?: AdvanceSort,
  dir?: 'asc' | 'desc',
): AdvanceRow[] {
  const key = sort ?? 'date';
  const d = dir ?? (key === 'date' && tab !== 'decide' ? 'desc' : 'asc');
  const sign = d === 'asc' ? 1 : -1;
  const value = (r: AdvanceRow): string | number =>
    key === 'amount'
      ? r.amount
      : key === 'remaining'
        ? r.remaining
        : key === 'employee'
          ? r.employeeName
          : r.dateRequested;
  return [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    const c =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    return c * sign || a.id.localeCompare(b.id);
  });
}

export function summarizeAdvances(
  all: AdvanceRow[],
  from?: string,
  to?: string,
): AdvanceSummary {
  const ranged = all.filter((r) => inRange(r.dateRequested, from, to));
  const sum = (rows: AdvanceRow[], f: (r: AdvanceRow) => number) =>
    Math.round(rows.reduce((s, r) => s + f(r), 0) * 100) / 100;
  return {
    requested: sum(ranged, (r) => r.amount),
    approved: sum(
      ranged.filter((r) => r.status === 'Approved'),
      (r) => r.amount,
    ),
    pendingCount: all.filter((r) => r.status === 'Pending').length,
    outstanding: sum(all, (r) => r.remaining),
  };
}

export function listAdvanceView(
  all: AdvanceRow[],
  q: AdvanceQuery,
  routes: RouteRef[],
): AdvanceListResult {
  const tabs: AdvanceTab[] = ['decide', 'approved', 'rejected', 'all'];
  const rows = sortAdvances(
    applyAdvanceFilters(rowsForTab(all, q), q),
    q.tab,
    q.sort,
    q.dir,
  );
  return {
    ...paginate(rows, q.page, q.limit),
    summary: summarizeAdvances(all, q.from, q.to),
    tabCounts: Object.fromEntries(
      tabs.map((t) => [t, rowsForTab(all, { ...q, tab: t }).length]),
    ) as Record<AdvanceTab, number>,
    roles: [...new Set(all.map((r) => r.role).filter(Boolean))].sort(),
    routes,
  };
}
