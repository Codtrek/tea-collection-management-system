export interface PayrollRow {
  id: string
  employeeId: string
  employeeName: string
  period: string
  gross: number
  deductions: {
    advances: number
    other: number
  }
  status: 'Pending' | 'Processed'
  missingBank?: boolean
}