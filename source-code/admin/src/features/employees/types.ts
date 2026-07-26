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
  hasLogin: boolean
  lastUpdatedBy?: string
  lastUpdatedOn?: string
  /** Additive — shift-based pay rates (Rs./hour), the input to payroll generation. */
  rates?: ShiftBreakdown
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
  /** flagged when the employee has no bank details — excluded from a run */
  missingBank?: boolean
  /** Hours aggregated from attendance, behind the stored `gross` snapshot. */
  shiftHours?: ShiftBreakdown
  /** The employee's rates at the time this row was generated. */
  rates?: ShiftBreakdown
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
