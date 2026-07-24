export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Half-day'

export interface Employee {
  id: string
  name: string
  status: 'Active' | 'Inactive'
}