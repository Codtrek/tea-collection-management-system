export type EmployeeStatus = 'Active' | 'Suspended' | 'Inactive'
export type EmploymentType = 'Permanent' | 'Contract' | 'Casual'

/** Shift-based hours or rates: Day / Day-OT / Night / Night-OT. */
export interface ShiftBreakdown {
  day: number
  dayOt: number
  night: number
  nightOt: number
}

export interface Employee {
  id: string
  name: string
  nic: string
  dob: string
  contact: string
  address: string
  role: string
  department: string
  hireDate: string
  employmentType: EmploymentType
  status: EmployeeStatus
  bank: { bank: string; branch: string; account: string }
  /** how the employee is paid — cash-paid employees need no bank details */
  paymentMethod: EmployeePaymentMethod
  hasLogin: boolean
  lastUpdatedBy?: string
  lastUpdatedOn?: string
  /** Additive — shift-based pay rates (Rs./hour), the input to payroll generation. */
  rates?: ShiftBreakdown
  /**
   * Only on the create/update response that provisioned a Tea Collecting Agent's mobile login:
   * the one-time temporary password. Show it once; it is never returned again.
   */
  initialPassword?: string
}

/** From GET /employees/roles — the single source for the role dropdown. */
export interface EmployeeRoles {
  roles: string[]
  /** the job title that makes someone a collection agent (shown on the dispatch board) */
  agentRole: string
}

/** One row of a Tea Collecting Agent's collection history (mirrors the backend's PublicAgentHistoryRow). */
export interface AgentHistoryRow {
  id: string
  date: string
  route: string
  /** set when the agent was COVERING this route that day */
  coveringRoute: string | null
  estateName: string
  estateWeightKg: number
  /** graded total once graded, else the estate weight */
  weightKg: number
  graded: boolean
  gradeLines: Array<{ grade: 'Super' | 'Normal'; weightKg: number }>
  status: string
}

/** One finished fertilizer delivery attempt in an agent's history (mirrors the backend's PublicAgentFertilizerRow). */
export interface AgentFertilizerRow {
  deliveryId: number
  date: string
  /** 'FR-2026-0001'; null only if the request is gone */
  requestId: string | null
  estateName: string
  route: string
  /** set when the agent was COVERING this route that day */
  coveringRoute: string | null
  item: string
  handedOverKg: number | null
  /** 0 for a failed attempt */
  deliveredKg: number
  outcome: 'Delivered' | 'Partially delivered' | 'Failed'
  failReason: string | null
  /** the agent's note on a failure, or the shortfall reason on a part delivery */
  note: string | null
}

export type AdvanceStatus = 'Pending' | 'Approved' | 'Rejected'
export interface Advance {
  id: string
  employeeId: string
  employeeName: string
  amount: number
  reason: string
  dateRequested: string
  status: AdvanceStatus
  decidedBy?: string
  decidedOn?: string
  /** given with the decision — required to reject */
  decisionReason?: string
  /** Salary-Advances-Addendum — computed server-side (advance-balance.ts), never here */
  recovery: RecoveryStatus | null
  remaining: number
  /** the payroll month that deducts (or deducted) it */
  payrollPeriod: string | null
  recoveredPeriod: string | null
}

export type RecoveryStatus = 'Not started' | 'Recovering' | 'Recovered'

export interface RouteRef {
  id: number
  name: string
}

export interface AdvanceRow extends Advance {
  role: string
  /** agents only: the routes they're responsible for today */
  routes: RouteRef[]
}

export type AdvanceTab = 'decide' | 'approved' | 'rejected' | 'all'

export interface AdvanceListResult {
  rows: AdvanceRow[]
  page: number
  limit: number
  total: number
  hasMore: boolean
  summary: { requested: number; approved: number; pendingCount: number; outstanding: number }
  tabCounts: Record<AdvanceTab, number>
  roles: string[]
  routes: RouteRef[]
}

export interface AdvanceDetail {
  advance: AdvanceRow
  previous: AdvanceRow[]
  outstanding: number
}

export interface EmployeeAdvances {
  outstanding: number
  advances: AdvanceRow[]
}

export type PayrollStatus = 'Pending' | 'Processed'

export interface PayrollRow {
  id: string
  employeeId: string
  employeeName: string
  period: string
  gross: number
  deductions: { advances: number; other: number }
  status: PayrollStatus
  /** generate-time snapshot of "no bank details" — the live check is `problems.noBank` */
  missingBank?: boolean
  /** left out of a run with this reason (bank-paid, no bank details); the row stays Pending */
  excludedReason?: string
  /** Hours aggregated from attendance, behind the stored `gross` snapshot. */
  shiftHours?: ShiftBreakdown
  /** The employee's rates at the time this row was generated. */
  rates?: ShiftBreakdown
}

export type EmployeePaymentMethod = 'bank' | 'cash'

/*
  Payroll by month, Part C (Payroll-Month-History-Addendum) — mirrors the backend's
  `payroll-view.ts`. Problems are live employee data, kept apart from the Pending/Processed status.
*/
export type PayrollIssue = 'noBank' | 'zeroGross' | 'hasDeductions' | 'hasAdvance'

export interface PayrollViewRow extends PayrollRow {
  role: string
  routes: RouteRef[]
  paymentMethod: EmployeePaymentMethod
  deductionsTotal: number
  net: number
  problems: { noBank: boolean; zeroGross: boolean }
}

export type MonthReadiness = 'In progress' | 'No payroll' | 'Issues to fix' | 'Ready to process' | 'Processed'

export interface PayrollReadiness {
  status: MonthReadiness
  /** bank-paid with no bank details, not yet excluded — what stops "Ready to process" */
  blocking: number
  /** Rs. 0 gross */
  warnings: number
  /** Pending rows left out of a run with a reason */
  excluded: number
}

export interface PayrollMonthResult {
  rows: PayrollViewRow[]
  page: number
  limit: number
  total: number
  hasMore: boolean
  /** always the WHOLE month */
  summary: { net: number; employees: number; prev: { period: string; net: number; employees: number } }
  readiness: PayrollReadiness
  roles: string[]
  routes: RouteRef[]
  periods: string[]
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Half-day'

export interface AttendanceRecord {
  employeeId: string
  employeeName: string
  date: string
  status: AttendanceStatus
  dayHours: number
  dayOtHours: number
  nightHours: number
  nightOtHours: number
  markedBy?: string
}
