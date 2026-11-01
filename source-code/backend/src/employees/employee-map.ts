import type { PayslipAdvanceLine, RecoveryStatus } from './advance-balance';

/**
 * DB ↔ portal mapping for the Employees module. Unlike Estates/Collections,
 * every status enum here uses the exact same string on both sides (the DB
 * CHECK constraints were written to match the portal's types directly), so
 * there's no DB→App conversion table — these are just shared type aliases.
 * Mirrors `estates/estate-map.ts`'s id-formatting + Public-shape pattern.
 */

export type DbEmployeeStatus = 'Active' | 'Suspended' | 'Inactive';
export type DbEmploymentType = 'Permanent' | 'Contract' | 'Casual';
export type DbAttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Half-day';
export type DbAdvanceStatus = 'Pending' | 'Approved' | 'Rejected';
export type DbPayrollStatus = 'Pending' | 'Processed';
/** how an employee is paid (Payroll filters, 2026-11-01) */
export type EmployeePaymentMethod = 'bank' | 'cash';

/** 'EMP-0001' — formatted from the employees.id serial, not stored directly. */
export function formatEmployeeId(id: number): string {
  return `EMP-${String(id).padStart(4, '0')}`;
}

/** Inverse of `formatEmployeeId`. Throws (NaN) on a malformed id — caller turns that into a 404. */
export function parseEmployeeId(formatted: string): number {
  return Number(formatted.replace(/^EMP-/, ''));
}

/* ── Portal-facing shapes — byte-identical to `features/employees/types.ts` ── */

export interface EmployeeBank {
  bank: string;
  branch: string;
  account: string;
}

export interface ShiftHours {
  day: number;
  dayOt: number;
  night: number;
  nightOt: number;
}

export interface PublicEmployee {
  id: string;
  name: string;
  nic: string;
  dob: string;
  contact: string;
  address: string;
  role: string;
  department: string;
  hireDate: string;
  employmentType: DbEmploymentType;
  status: DbEmployeeStatus;
  bank: EmployeeBank;
  paymentMethod: EmployeePaymentMethod;
  hasLogin: boolean;
  lastUpdatedBy?: string;
  lastUpdatedOn?: string;
  /** Additive — shift-based pay rates (Rs./hour), the input to payroll generation. */
  rates?: ShiftHours;
  /**
   * Tea Collecting Agents only, and ONLY on the create/update response that provisioned the
   * mobile login: the one-time temporary password. Never stored in plain text, never returned again.
   */
  initialPassword?: string;
}

export interface PublicAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  dateRequested: string;
  status: DbAdvanceStatus;
  decidedBy?: string;
  decidedOn?: string;
  /** given with the decision — always present on a rejection made since 2026-11-01 */
  decisionReason?: string;
  /** Salary-Advances-Addendum — from advance-balance.ts, the one place these are computed */
  recovery: RecoveryStatus | null;
  remaining: number;
  /** Σ recovered so far */
  recovered: number;
  /** Σ (planned − deducted) over its payroll months — what the gross couldn't take */
  carriedForward: number;
  /** the Pending payroll month that deducts from it next, if one is reserved */
  payrollPeriod: string | null;
  /** the latest month it was (partly) recovered in */
  recoveredPeriod: string | null;
}

export interface PublicAttendance {
  employeeId: string;
  employeeName: string;
  date: string;
  status: DbAttendanceStatus;
  dayHours: number;
  dayOtHours: number;
  nightHours: number;
  nightOtHours: number;
  markedBy?: string;
}

export interface PublicPayrollRow {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string;
  gross: number;
  deductions: { advances: number; other: number };
  status: DbPayrollStatus;
  missingBank?: boolean;
  /** left out of a run with this reason (bank-paid, no bank details); the row stays Pending */
  excludedReason?: string;
  /** Salary-Advances-Addendum §9 — per advance: planned / deducted / carried forward / remaining */
  advanceLines?: PayslipAdvanceLine[];
  /** Additive — shift-hours/rate breakdown behind the stored `gross` snapshot. */
  shiftHours?: ShiftHours;
  rates?: ShiftHours;
}
