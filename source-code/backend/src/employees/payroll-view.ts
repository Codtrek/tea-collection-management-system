/**
 * Payroll month view (Payroll-Month-History-Addendum, Part C) — issues, filters, summary and
 * readiness. Pure helpers, tested in payroll-view.spec.ts. Viewing only: gross, deductions and
 * net are the stored payroll row; how payroll is calculated is unchanged.
 *
 * Status (Pending / Processed) and PROBLEMS are kept apart. A problem is live employee data:
 *   noBank    — paid by bank with no bank details. BLOCKS processing (exclude with a reason).
 *   zeroGross — Rs. 0 gross. A warning only.
 */
import type { PaginatedResult } from '../estates/estate-lifetime-map';
import { paginate } from '../estates/settlement-view';
import type { EmployeePaymentMethod, PublicPayrollRow } from './employee-map';
import type { RouteRef } from './employee-routes.service';

type BankFacts = {
  paymentMethod?: EmployeePaymentMethod | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccount: string | null;
};

/** Paid by bank, but a bank field is empty. Cash-paid employees never count. */
export function hasNoBankDetails(e: BankFacts | undefined): boolean {
  if (!e || e.paymentMethod === 'cash') return false;
  return !e.bankName || !e.bankBranch || !e.bankAccount;
}

export type PayrollIssue =
  | 'noBank'
  | 'zeroGross'
  | 'hasDeductions'
  | 'hasAdvance';
export const PAYROLL_ISSUES: readonly PayrollIssue[] = [
  'noBank',
  'zeroGross',
  'hasDeductions',
  'hasAdvance',
];

export interface PayrollViewRow extends PublicPayrollRow {
  role: string;
  routes: RouteRef[];
  paymentMethod: EmployeePaymentMethod;
  deductionsTotal: number;
  net: number;
  /** the data problems shown as chips — never the status */
  problems: { noBank: boolean; zeroGross: boolean };
}

export type PayrollSort = 'employee' | 'gross' | 'deductions' | 'net';

export interface PayrollQuery {
  /** 'YYYY-MM' */
  month: string;
  search?: string;
  role?: string;
  routeId?: number;
  status?: 'Pending' | 'Processed';
  /** any of these */
  issues?: PayrollIssue[];
  method?: EmployeePaymentMethod;
  sort?: PayrollSort;
  dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type MonthReadiness =
  | 'In progress'
  | 'No payroll'
  | 'Issues to fix'
  | 'Ready to process'
  | 'Processed';

export interface PayrollReadiness {
  status: MonthReadiness;
  /** Pending, bank-paid, no bank details, not excluded — what stops "Ready to process" */
  blocking: number;
  /** Rs. 0 gross */
  warnings: number;
  /** Pending rows left out of a run with a reason */
  excluded: number;
}

export interface PayrollMonthResult extends PaginatedResult<PayrollViewRow> {
  /** always the WHOLE month — "Showing X of Y" when filters are active */
  summary: {
    net: number;
    employees: number;
    prev: { period: string; net: number; employees: number };
  };
  readiness: PayrollReadiness;
  roles: string[];
  routes: RouteRef[];
  /** every period with payroll ('July 2026'), for the picker */
  periods: string[];
}

const hasIssue = (r: PayrollViewRow, issue: PayrollIssue): boolean => {
  switch (issue) {
    case 'noBank':
      return r.problems.noBank;
    case 'zeroGross':
      return r.problems.zeroGross;
    case 'hasDeductions':
      return r.deductionsTotal > 0;
    case 'hasAdvance':
      return r.deductions.advances > 0;
  }
};

export function applyPayrollFilters(
  rows: PayrollViewRow[],
  q: PayrollQuery,
): PayrollViewRow[] {
  const needle = q.search?.trim().toLowerCase() ?? '';
  return rows.filter(
    (r) =>
      (!needle ||
        r.employeeName.toLowerCase().includes(needle) ||
        r.employeeId.toLowerCase().includes(needle)) &&
      (!q.role || r.role === q.role) &&
      (q.routeId === undefined || r.routes.some((x) => x.id === q.routeId)) &&
      (!q.status || r.status === q.status) &&
      (!q.method || r.paymentMethod === q.method) &&
      (!q.issues?.length || q.issues.some((i) => hasIssue(r, i))),
  );
}

export function sortPayroll(
  rows: PayrollViewRow[],
  sort: PayrollSort = 'employee',
  dir: 'asc' | 'desc' = 'asc',
): PayrollViewRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const value = (r: PayrollViewRow): number | string =>
    sort === 'gross'
      ? r.gross
      : sort === 'deductions'
        ? r.deductionsTotal
        : sort === 'net'
          ? r.net
          : r.employeeName;
  return [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    const c =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    return c * sign || a.employeeName.localeCompare(b.employeeName);
  });
}

/**
 * The month badge. "Ready to process" only with no blocking issue; a month whose remaining
 * Pending rows were all excluded with a reason counts as Processed.
 */
export function readinessOf(
  rows: PayrollViewRow[],
  month: string,
  current: string,
): PayrollReadiness {
  const pending = rows.filter((r) => r.status === 'Pending');
  const excluded = pending.filter((r) => !!r.excludedReason).length;
  const blocking = pending.filter(
    (r) => r.problems.noBank && !r.excludedReason,
  ).length;
  const warnings = rows.filter((r) => r.problems.zeroGross).length;
  const status: MonthReadiness =
    month === current
      ? 'In progress'
      : rows.length === 0
        ? 'No payroll'
        : pending.length === excluded
          ? 'Processed'
          : blocking > 0
            ? 'Issues to fix'
            : 'Ready to process';
  return { status, blocking, warnings, excluded };
}

export function payrollMonthView(
  monthRows: PayrollViewRow[],
  prevRows: PayrollViewRow[],
  prevPeriod: string,
  q: PayrollQuery,
  current: string,
  extras: { routes: RouteRef[]; periods: string[] },
): PayrollMonthResult {
  const total = (rows: PayrollViewRow[]) =>
    Math.round(rows.reduce((s, r) => s + r.net, 0) * 100) / 100;
  const filtered = sortPayroll(
    applyPayrollFilters(monthRows, q),
    q.sort,
    q.dir,
  );
  return {
    ...paginate(filtered, q.page, q.limit),
    summary: {
      net: total(monthRows),
      employees: monthRows.length,
      prev: {
        period: prevPeriod,
        net: total(prevRows),
        employees: prevRows.length,
      },
    },
    readiness: readinessOf(monthRows, q.month, current),
    roles: [...new Set(monthRows.map((r) => r.role).filter(Boolean))].sort(),
    routes: extras.routes,
    periods: extras.periods,
  };
}
