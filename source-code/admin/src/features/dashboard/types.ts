/*
  GET /dashboard/summary (Dashboard-Addendum) — mirrors backend/src/dashboard/dashboard.service.ts.
  Every figure is another page's own number; `href` opens the records it counts.
*/

export type MonthReadiness = 'In progress' | 'No payroll' | 'Issues to fix' | 'Ready to process' | 'Processed'

export interface ActionItem {
  key: string
  count: number
  label: string
  href: string
  urgency: number
}

export interface QuickAction {
  key: string
  label: string
  /** a page, or `#needs-action` */
  href: string
}

export interface IntakeFigure {
  kg: number
  deliveries: number
  compareKg: number | null
  changePct: number | null
}

export interface TodayView {
  leaf?: IntakeFigure & { compareDate: string; href: string }
  grading?: {
    waiting: number
    waitingHref: string
    overTolerance: number
    tolerancePct: number
    mismatchHref: string
  }
  agents?: {
    onRoute: number
    notStarted: number
    absent: number
    covering: number
    completed: number
    scheduled: number
    href: string
  }
  fertilizer?: { done: number; failed: number; pending: number; total: number; href: string }
}

export interface MonthView {
  label: string
  intake?: IntakeFigure & {
    lastYearKg: number | null
    yoyPct: number | null
    superShare: number | null
    href: string
  }
  leafPurchase?: { valueRs: number; rsPerKg: number | null; changePct: number | null; href: string }
  expenses?: { totalRs: number; changePct: number | null; href: string }
  payroll?: {
    month: string
    status: MonthReadiness
    lastMonth: string
    lastMonthStatus: MonthReadiness
    href: string
  }
}

export interface DashboardCharts {
  daily: {
    key: string
    label: string
    kg: number
    deliveries: number
    partial: boolean
    lastMonthKg: number | null
  }[]
  lastMonthLabel: string
  byRoute: { id: number | null; name: string; kg: number; deliveries: number }[]
  href: string
}

export interface ActivityEntry {
  id: string
  timestamp: string
  user: string
  role: string
  action: string
  module: string
  record?: string
  recordHref?: string
  details?: string
}

export interface DashboardSummary {
  generatedAt: string
  /** factory calendar date (Asia/Colombo) */
  today: string
  month: string
  role: 'Administrator' | 'Officer' | 'Manager'
  actions: ActionItem[]
  quickActions: QuickAction[]
  todayView: TodayView | null
  monthView: MonthView | null
  charts: DashboardCharts | null
  activity: ActivityEntry[]
}
