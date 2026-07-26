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
  hasLogin: boolean;
  lastUpdatedBy?: string;
  lastUpdatedOn?: string;
  /** Additive — shift-based pay rates (Rs./hour), the input to payroll generation. */
  rates?: ShiftHours;
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
  /** Additive — shift-hours/rate breakdown behind the stored `gross` snapshot. */
  shiftHours?: ShiftHours;
  rates?: ShiftHours;
}
