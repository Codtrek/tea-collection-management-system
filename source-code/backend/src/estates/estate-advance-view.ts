import {
  type EstateAdvanceRecoveryStatus,
  recoveredOf,
  recoveryStatus,
  remainingOf,
} from './estate-advance-balance';
import type { PublicAdvance } from './estate-map';
import type { EstateFacts } from './settlement-view';
import { paginate } from './settlement-view';
import { localDate } from '../dispatch/dispatch-map';
import type { PaginatedResult } from './estate-lifetime-map';

/*
  EST-05 list / detail (Estate-Owner-Advances-Addendum §3). Pure: filter, summarise and page
  advances that the service has already loaded. Balances come from estate-advance-balance.ts.
*/

export interface EstateAdvanceRow extends PublicAdvance {
  ownerName: string;
  routeId: number | null;
  route: string;
  recovered: number;
  remaining: number;
  recovery: EstateAdvanceRecoveryStatus;
}

export interface EstateAdvanceQuery {
  /** estate, owner or EADV- reference */
  search?: string;
  routeId?: number;
  status?: EstateAdvanceRecoveryStatus;
  issuedBy?: string;
  /** date issued, YYYY-MM-DD inclusive — advances still pending deduction show whatever the dates */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface EstateAdvanceSummary {
  /** issued in the range */
  issued: number;
  issuedCount: number;
  /** recovered by settlements processed in the range */
  deducted: number;
  /** every remaining balance, any date */
  pendingDeduction: number;
  pendingCount: number;
}

export interface EstateAdvanceListResult extends PaginatedResult<EstateAdvanceRow> {
  summary: EstateAdvanceSummary;
  routes: { id: number; name: string }[];
  issuers: string[];
}

interface AdvanceSource {
  id: string;
  estateId: number;
  amount: string | number;
}
interface RecoverySource {
  advanceId: string;
  amount: string | number;
  recoveredAt: Date;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const inRange = (date: string, from?: string, to?: string): boolean =>
  (!from || date >= from) && (!to || date <= to);

export function toAdvanceRow(
  pub: PublicAdvance,
  source: AdvanceSource,
  facts: EstateFacts | undefined,
  recoveries: RecoverySource[],
): EstateAdvanceRow {
  return {
    ...pub,
    ownerName: facts?.ownerName ?? 'Unknown',
    routeId: facts?.routeId ?? null,
    route: facts?.route ?? '',
    recovered: recoveredOf(source.id, recoveries),
    remaining: remainingOf(source, recoveries),
    recovery: recoveryStatus(source, recoveries),
  };
}

export function applyAdvanceFilters(
  rows: EstateAdvanceRow[],
  q: EstateAdvanceQuery,
): EstateAdvanceRow[] {
  const needle = q.search?.trim().toLowerCase() ?? '';
  return rows.filter(
    (r) =>
      // pending deductions always show, so an old unrecovered advance is never hidden
      (r.remaining > 0 || inRange(r.dateIssued, q.from, q.to)) &&
      (!needle ||
        `${r.estateName} ${r.ownerName} ${r.id} ${r.estateId}`
          .toLowerCase()
          .includes(needle)) &&
      (q.routeId === undefined || r.routeId === q.routeId) &&
      (!q.status || r.recovery === q.status) &&
      (!q.issuedBy || r.issuedBy === q.issuedBy),
  );
}

/** Newest first; ties by reference so pages are stable. */
export function sortAdvanceRows(rows: EstateAdvanceRow[]): EstateAdvanceRow[] {
  return [...rows].sort(
    (a, b) =>
      b.dateIssued.localeCompare(a.dateIssued) || b.id.localeCompare(a.id),
  );
}

/** For the range only — the search / route / status / issuer filters never change the totals. */
export function summarizeAdvances(
  rows: EstateAdvanceRow[],
  recoveries: RecoverySource[],
  from?: string,
  to?: string,
): EstateAdvanceSummary {
  const issued = rows.filter((r) => inRange(r.dateIssued, from, to));
  const pending = rows.filter((r) => r.remaining > 0);
  return {
    issued: round2(issued.reduce((s, r) => s + r.amount, 0)),
    issuedCount: issued.length,
    deducted: round2(
      recoveries
        .filter((r) => inRange(localDate(r.recoveredAt), from, to))
        .reduce((s, r) => s + Number(r.amount), 0),
    ),
    pendingDeduction: round2(pending.reduce((s, r) => s + r.remaining, 0)),
    pendingCount: pending.length,
  };
}

export function buildAdvanceList(
  rows: EstateAdvanceRow[],
  recoveries: RecoverySource[],
  q: EstateAdvanceQuery,
): EstateAdvanceListResult {
  const filtered = sortAdvanceRows(applyAdvanceFilters(rows, q));
  const routes = new Map<number, string>();
  for (const r of rows) if (r.routeId !== null) routes.set(r.routeId, r.route);
  return {
    ...paginate(filtered, q.page ?? 0, q.pageSize ?? 25),
    summary: summarizeAdvances(rows, recoveries, q.from, q.to),
    routes: [...routes]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    issuers: [...new Set(rows.map((r) => r.issuedBy))].sort(),
  };
}
