/*
  GET /dashboard/summary (Dashboard-Addendum) — mirrors `DashboardSummary` in
  backend/src/dashboard/dashboard.service.ts. Both sides test their top-level keys against the
  same list (`DASHBOARD_SUMMARY_KEYS`), so a field added or removed on one side fails a test.
  Every figure is another page's own number; `href` opens the records it counts.
*/

export type MonthReadiness = 'In progress' | 'No payroll' | 'Issues to fix' | 'Ready to process' | 'Processed'

/** urgent: blocks money or is overdue · dueSoon: due this cycle · toDecide: someone is waiting */
export type ActionGroup = 'urgent' | 'dueSoon' | 'toDecide'

export interface ActionItem {
  key: string
  count: number
  label: string
  /** why it matters or what holds it, from the same list; null when the label says it all */
  reason: string | null
  /** the page listing exactly these `count` records */
  href: string
  group: ActionGroup
  urgency: number
  /** the button's word — it only opens `href`; nothing is decided on the dashboard */
  action: string
  /** this item holds up another one (e.g. missing bank details → settlements) */
  blocks?: string
  /** it can't move until something else is fixed (e.g. no transport amount) */
  blocked?: boolean
}

export interface IntakeFigure {
  kg: number
  deliveries: number
  compareKg: number | null
  changePct: number | null
}

/** The report's own comparison window, e.g. 1–17 Oct for 1–17 Nov. */
export interface CompareWindow {
  from: string
  to: string
}

export interface SettlementState {
  pending: number
  noBank: number
  /** a pending month has no transport version: nothing can be processed */
  transportMissing: boolean
  href: string
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
    compare: CompareWindow
    lastYearKg: number | null
    yoyPct: number | null
    superShare: number | null
    superKg: number
    normalKg: number
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
  settlements?: SettlementState
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
  /** the report's change against the same days last month */
  changePct: number | null
  compare: CompareWindow
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

export type Section = 'actions' | 'today' | 'month' | 'charts' | 'activity'

export interface DashboardSummary {
  generatedAt: string
  /** factory calendar date (Asia/Colombo) */
  today: string
  month: string
  role: 'Administrator' | 'Officer' | 'Manager'
  actions: ActionItem[]
  /** the page's one primary button: the top queue item's action; null with an empty queue */
  primaryAction: { label: string; href: string; key: string } | null
  /** "Review approvals (N)": the To decide items */
  toDecide: number
  /** null: not for this role */
  todayView: TodayView | null
  monthView: MonthView | null
  charts: DashboardCharts | null
  activity: ActivityEntry[]
  /** a section whose source failed (server) or didn't arrive (parseSummary): shown inline in that block */
  errors: Partial<Record<Section, string>>
}
