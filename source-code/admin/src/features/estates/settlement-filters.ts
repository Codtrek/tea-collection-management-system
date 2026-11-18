import { ALL_PERIODS } from '@/components/patterns/MonthPicker'
import { readMonth, shiftMonth } from '@/lib/month'
import type { SettlementQuery } from '@/services/estates'

/*
  EST-07 period view (Settlement-Period-View-Addendum) — every filter lives in the URL, so a
  filtered view can be shared or bookmarked. Pure; tested in settlement-filters.test.ts.
*/

export interface SettlementFilters {
  /** 'YYYY-MM' or 'all' */
  month: string
  search: string
  route: string
  status: string
  method: string
  /** net payable zero or negative only */
  nonPositive: boolean
  sort: string
  dir: '' | 'asc' | 'desc'
  page: number
}

/**
 * Settlements are processed after a month ends, so the page opens on LAST month. Any month up
 * to the current one can be chosen (never a future one), or "All periods".
 */
export function defaultSettlementMonth(current: string): string {
  return shiftMonth(current, -1)
}

export function readSettlementFilters(p: URLSearchParams, current: string): SettlementFilters {
  const m = p.get('month')
  const dir = p.get('dir')
  return {
    month: m === ALL_PERIODS ? ALL_PERIODS : readMonth(m, current, defaultSettlementMonth(current)),
    search: p.get('q') ?? '',
    route: p.get('route') ?? '',
    status: p.get('status') ?? '',
    method: p.get('method') ?? '',
    nonPositive: p.get('net') === 'nonpositive',
    sort: p.get('sort') ?? '',
    dir: dir === 'asc' || dir === 'desc' ? dir : '',
    page: Math.max(0, Number(p.get('page')) || 0),
  }
}

/** Only non-default values go in the URL — the default view is a bare `/estates/settlements`. */
export function settlementParams(f: SettlementFilters, current: string): URLSearchParams {
  const p = new URLSearchParams()
  if (f.month !== defaultSettlementMonth(current)) p.set('month', f.month)
  if (f.search) p.set('q', f.search)
  if (f.route) p.set('route', f.route)
  if (f.status) p.set('status', f.status)
  if (f.method) p.set('method', f.method)
  if (f.nonPositive) p.set('net', 'nonpositive')
  if (f.sort && f.dir) {
    p.set('sort', f.sort)
    p.set('dir', f.dir)
  }
  if (f.page > 0) p.set('page', String(f.page))
  return p
}

export const SETTLEMENT_PAGE_SIZE = 25

/** The API query for these filters (limit 0 = every row, for the CSV export). */
export function settlementQuery(f: SettlementFilters, limit = SETTLEMENT_PAGE_SIZE): SettlementQuery {
  return {
    month: f.month,
    search: f.search || undefined,
    routeId: f.route ? Number(f.route) : undefined,
    status: f.status || undefined,
    method: f.method || undefined,
    nonPositive: f.nonPositive || undefined,
    sort: f.sort && f.dir ? f.sort : undefined,
    dir: f.sort && f.dir ? f.dir : undefined,
    page: limit === 0 ? undefined : f.page,
    limit,
  }
}

/** Any filter beyond the month — the summary then says "Showing X of Y". */
export function hasActiveFilters(f: SettlementFilters): boolean {
  return !!(f.search || f.route || f.status || f.method || f.nonPositive)
}
