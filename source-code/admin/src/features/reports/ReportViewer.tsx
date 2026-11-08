import type { ReactNode } from 'react'
import { CalendarClock, FileDown, FileSpreadsheet, Printer, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/*
  Shared shell for RPT-01/02/03 (reports doc): filters row → summary stat
  cards → chart area → detail table, with the §10.5 actions bar attached.
*/

export interface ReportActions {
  /** downloads the report's table (current filters, every row) as a spreadsheet file */
  onExportExcel?: () => void
  /** opens the browser's print dialog on the print layout */
  onPrint?: () => void
}

/**
 * The report actions. An action works only when the page gives it a handler; otherwise it is
 * shown disabled with "Coming soon" — never a pretend success. PDF export, scheduling and sharing
 * don't exist yet (Reports-Collection-Addendum §8). Preview is gone: Print shows the same page.
 */
export function ReportActionsBar({ onExportExcel, onPrint }: ReportActions = {}) {
  const actions: Array<{ label: string; icon: ReactNode; onClick?: () => void }> = [
    { label: 'Export Excel', icon: <FileSpreadsheet className="size-4" />, onClick: onExportExcel },
    { label: 'Print', icon: <Printer className="size-4" />, onClick: onPrint },
    { label: 'Export PDF', icon: <FileDown className="size-4" /> },
    { label: 'Schedule Report', icon: <CalendarClock className="size-4" /> },
    // Shared reports must keep §13 field-level masking for recipients — sharing
    // must never become a way around the permission model.
    { label: 'Share Report', icon: <Share2 className="size-4" /> },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {actions.map((a) =>
        a.onClick ? (
          <Button key={a.label} size="sm" variant="secondary" onClick={a.onClick}>
            {a.icon}
            {a.label}
          </Button>
        ) : (
          // a disabled button swallows hover, so the tooltip sits on its wrapper
          <span key={a.label} title="Coming soon" className="inline-flex">
            <Button size="sm" variant="secondary" disabled aria-label={`${a.label} (coming soon)`}>
              {a.icon}
              {a.label}
            </Button>
          </span>
        ),
      )}
    </div>
  )
}

export interface ReportViewerProps {
  filters: ReactNode
  summary: ReactNode
  charts: ReactNode
  table: ReactNode
  /** override the filter / summary grids (defaults: three columns) */
  filtersClassName?: string
  summaryClassName?: string
  /** the actions that work on this report; the rest show "Coming soon" */
  actions?: ReportActions
}

export function ReportViewer({ filters, summary, charts, table, filtersClassName, summaryClassName, actions }: ReportViewerProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className={filtersClassName ?? 'grid flex-1 gap-3 sm:grid-cols-3'}>{filters}</div>
      </div>
      <div className={summaryClassName ?? 'grid gap-4 sm:grid-cols-3'}>{summary}</div>
      {charts}
      {table}
      <div className="border-t border-border pt-4 print:hidden">
        <ReportActionsBar {...actions} />
      </div>
    </div>
  )
}
