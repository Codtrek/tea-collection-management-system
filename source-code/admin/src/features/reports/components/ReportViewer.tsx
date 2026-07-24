import type { ReactNode } from 'react'
import { CalendarClock, Eye, FileDown, FileSpreadsheet, Printer, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

/*
  Shared shell for RPT-01/02/03 (reports doc): filters row → summary stat
  cards → chart area → detail table, with the §10.5 actions bar attached.
*/

export function ReportActionsBar() {
  const { toast } = useToast()
  const actions: Array<{ label: string; icon: ReactNode }> = [
    { label: 'Preview', icon: <Eye className="size-4" /> },
    { label: 'Export PDF', icon: <FileDown className="size-4" /> },
    { label: 'Export Excel', icon: <FileSpreadsheet className="size-4" /> },
    { label: 'Print', icon: <Printer className="size-4" /> },
    { label: 'Schedule Report', icon: <CalendarClock className="size-4" /> },
    // Shared reports keep §13 field-level masking for recipients — sharing
    // must never become a way around the permission model.
    { label: 'Share Report', icon: <Share2 className="size-4" /> },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Button key={a.label} size="sm" variant="secondary" onClick={() => toast(`${a.label} (demo)`)}>
          {a.icon}
          {a.label}
        </Button>
      ))}
    </div>
  )
}

export interface ReportViewerProps {
  filters: ReactNode
  summary: ReactNode
  charts: ReactNode
  table: ReactNode
}

export function ReportViewer({ filters, summary, charts, table }: ReportViewerProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">{filters}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">{summary}</div>
      {charts}
      {table}
      <div className="border-t border-border pt-4">
        <ReportActionsBar />
      </div>
    </div>
  )
}
