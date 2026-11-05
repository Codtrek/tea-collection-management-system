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
  /** office staff (Shop & Office Act) vs factory workers (Wages Board) */
  category?: 'factory' | 'office'
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
  recovered: number
  /** what the gross couldn't take in earlier months, still in the balance */
  carriedForward: number
  /** the payroll month that deducts (or deducted) it */
  payrollPeriod: string | null
  recoveredPeriod: string | null
  /** the repayment plan (Salary-Advances-Addendum §10) */
  plan: { installment: number; months: number; startPeriod: string | null }
  /** the next month that deducts from it, and the month it clears (projected server-side) */
  nextPeriod: string | null
  clearedPeriod: string | null
  requestedBy?: string
  /** the approver's note when they changed the requested plan */
  planChangeNote?: string
}

export type ScheduleStatus = 'Deducted' | 'Reserved' | 'Planned'

export interface ScheduleMonth {
  period: string
  planned: number
  deducted: number
  carried: number
  status: ScheduleStatus
}

export interface AdvanceReschedule {
  id: number
  installmentAmount: number
  startPeriod: string
  note: string
  status: 'Pending' | 'Approved' | 'Rejected'
  requestedBy: string | null
  decidedBy: string | null
  decidedOn: string | null
  decisionReason: string | null
  requestedOn: string
}

export interface SelfApprovalCheck {
  blocked: boolean
  reason: string | null
  /** false when a NIC was missing on either side — only the requester rule could run */
  identityChecked: boolean
}

export interface PayrollRules {
  advanceDeductionCapPct: number
  maxInstallmentMonths: number
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
  schedule: ScheduleMonth[]
  reschedules: AdvanceReschedule[]
  cashRepayments: { amount: number; paidOn: string | null; reference: string | null; recordedBy: string | null }[]
  /** for the logged-in user — Approve is disabled when blocked (the server enforces it too) */
  selfApproval: SelfApprovalCheck
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
  /** per advance this month: planned / deducted / carried forward / remaining (server-computed) */
  advanceLines?: PayslipAdvanceLine[]
  /** the leaving month's payroll — the whole advance balance was due (up to the cap) */
  isFinal?: boolean
  /** Hours aggregated from attendance, behind the stored `gross` snapshot. */
  shiftHours?: ShiftBreakdown
  /** The employee's rates at the time this row was generated. */
  rates?: ShiftBreakdown
}

export type EmployeePaymentMethod = 'bank' | 'cash'

export interface PayslipAdvanceLine {
  advanceId: string
  planned: number
  deducted: number
  /** planned − deducted, left in the balance for later months */
  carried: number
  remainingAfter: number
}

/*
  Payroll by month, Part C (Payroll-Month-History-Addendum) — mirrors the backend's
  `payroll-view.ts`. Problems are live employee data, kept apart from the Pending/Processed status.
*/
export type PayrollIssue = 'noBank' | 'zeroGross' | 'carriedForward' | 'hasDeductions' | 'hasAdvance'

export interface PayrollViewRow extends PayrollRow {
  role: string
  routes: RouteRef[]
  paymentMethod: EmployeePaymentMethod
  deductionsTotal: number
  net: number
  problems: { noBank: boolean; zeroGross: boolean; carriedForward: number }
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

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Half-day' | 'Short leave'

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

/* ── Attendance-Leave-Addendum Phase 1 — the month grid, the day view, the holiday calendar ── */

export type AttendanceCode = 'P' | 'A' | 'L' | 'H' | 'S' | 'W'
export type DayType = 'working' | 'half' | 'weekly' | 'rest' | 'poya' | 'public' | 'closure'

export interface AttendanceCell {
  date: string
  code: AttendanceCode | null
  status: AttendanceStatus | null
  tooltip: string
  dayType: DayType
  dayLabel: string | null
  future: boolean
  lockedReason: string | null
}

export interface AttendanceTotals {
  present: number
  absent: number
  leave: number
  half: number
  short: number
  holidayWorked: number
  workingDays: number
  pct: number | null
  unmarked: number
}

export interface AttendanceMonthRow {
  employeeId: string
  name: string
  role: string
  category: 'factory' | 'office'
  routes: { id: number; name: string }[]
  cells: AttendanceCell[]
  totals: AttendanceTotals
}

export interface AttendanceMonth {
  month: string
  today: string
  days: { date: string; dayType: DayType; label: string | null; today: boolean; future: boolean }[]
  rows: AttendanceMonthRow[]
  roles: string[]
  routes: { id: number; name: string }[]
}

export interface AttendanceDayRow {
  employeeId: string
  name: string
  role: string
  routes: { id: number; name: string }[]
  status: AttendanceStatus | null
  code: AttendanceCode | null
  half: 'AM' | 'PM' | null
  shortOut: string | null
  shortBack: string | null
  holidayWorked: boolean
  markedBy: string | null
  markedAt: string | null
  source: 'portal' | 'dispatch' | 'app' | 'leave' | 'holiday' | null
  dayType: DayType
  dayLabel: string | null
  workAllowed: boolean
  lockedReason: string | null
}

export interface AttendanceDay {
  date: string
  today: string
  editWindowDays: number
  needsReason: boolean
  rows: AttendanceDayRow[]
  summary: { present: number; absent: number; onLeave: number; notMarked: number }
}

export type HolidayKind = 'poya' | 'public' | 'closure'

export interface Holiday {
  id: number
  date: string
  name: string
  type: HolidayKind
  paid: boolean
  workAllowed: boolean
  appliesTo: 'all' | 'factory' | 'office'
  collectionStops: boolean
  declareGroup: string | null
  reason: string | null
  createdBy: string | null
  createdAt: string | null
  /** manual · google (imported) · file (uploaded .ics / CSV) */
  source: 'manual' | 'google' | 'file'
  importedAt: string | null
  cancelled: boolean
  cancelReason: string | null
  /** may the viewer change / cancel it — decided by the server (holiday permission matrix) */
  canChange: boolean
}

/** A Manager's proposal / request waiting for the Administrator, or an emergency closure to review. */
export interface HolidayRequest {
  id: number
  kind: 'weekly_rule' | 'closure' | 'emergency'
  status: 'pending' | 'approved' | 'rejected' | 'kept' | 'reverted'
  name: string
  dateFrom: string
  dateTo: string
  appliesTo: 'all' | 'factory' | 'office' | null
  summary: string
  reason: string | null
  requestedBy: string
  requestedAt: string
  decidedBy: string | null
  decidedAt: string | null
  decisionReason: string | null
}

/** applied = in force · pending = waiting for the Administrator · review = in force, reviewed after */
export type HolidayChangeResult = { status: 'applied' } | { status: 'pending' | 'review'; requestId: number }

export interface HolidayYear {
  year: number
  /** the calendar's first weekday: 0 = Sunday, 1 = Monday */
  weekStartsOn: 0 | 1
  holidays: Holiday[]
  counts: { poya: number; public: number; closure: number }
  pending: HolidayRequest[]
  types: { type: 'poya' | 'public' | 'weekly' | 'closure'; label: string; paid: boolean; workAllowed: boolean }[]
  weeklyRules: { id: number; category: 'factory' | 'office'; weekdays: number[]; halfDayWeekday: number | null; effectiveFrom: string; createdBy: string | null }[]
  restDays: { id: number; employeeId: string; employeeName: string; weekday: number | null; effectiveFrom: string }[]
  nextYearMissing: boolean
  nextYear: number
}

/** One employee category's day type (backend working-days.ts `dayInfo`). */
export interface HolidayDayInfo {
  type: 'working' | 'half' | 'weekly' | 'rest' | 'poya' | 'public' | 'closure'
  label: string | null
  working: boolean
  paid: boolean
  workAllowed: boolean
}

/** The day drawer (`GET /holidays/day/:date`). */
export interface HolidayDay {
  date: string
  holidays: Holiday[]
  pending: HolidayRequest[]
  dayType: { factory: HolidayDayInfo; office: HolidayDayInfo }
  impact: {
    attendanceMarked: number
    attendanceNames: string[]
    routes: { id: number; name: string }[]
    /** null until leave requests exist (Phase 2) */
    approvedLeave: number | null
  }
}

export interface DeclarePreview {
  dates: string[]
  attendance: { employeeId: string; name: string; date: string; status: string }[]
  routeDays: { routeId: number; routeName: string; date: string }[]
}
