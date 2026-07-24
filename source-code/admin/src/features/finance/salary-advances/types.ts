export interface Advance {
  id: string
  employeeId: string
  employeeName: string
  amount: number
  dateRequested: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

export type AdvanceStatus = 'Pending' | 'Approved' | 'Rejected'