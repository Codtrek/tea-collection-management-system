import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Holiday } from '@/features/employees/types'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { chipKind } from './calendar-model'
import { APPLIES_LABEL, CHIP_STYLE } from './holiday-style'

interface HolidayListViewProps {
  year: number
  holidays: Holiday[]
  onOpenDay: (date: string) => void
  onEdit: (h: Holiday) => void
  onCancel: (h: Holiday) => void
}

/** The year as a table — kept for printing and CSV export. Row buttons follow the server's `canChange`. */
export function HolidayListView({ year, holidays, onOpenDay, onEdit, onCancel }: HolidayListViewProps) {
  const exportCsv = () =>
    downloadCsv(
      `holidays-${year}.csv`,
      toCsv(
        [
          { header: 'Date', value: (h: Holiday) => h.date },
          { header: 'Name', value: (h: Holiday) => h.name },
          { header: 'Type', value: (h: Holiday) => CHIP_STYLE[chipKind(h)].label },
          { header: 'Applies to', value: (h: Holiday) => APPLIES_LABEL[h.appliesTo] },
          { header: 'Paid', value: (h: Holiday) => (h.paid ? 'Yes' : 'No') },
          { header: 'Work allowed', value: (h: Holiday) => (h.workAllowed ? 'Yes' : 'No') },
          { header: 'Source', value: (h: Holiday) => h.source },
          { header: 'Status', value: (h: Holiday) => (h.cancelled ? 'Cancelled' : 'Active') },
        ],
        holidays,
      ),
    )
  return (
    <div>
      <div className="flex justify-end gap-2 px-4 py-3 print:hidden">
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Print
        </Button>
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={holidays.length === 0}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken text-[11px] uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Paid · Work</th>
              <th className="px-4 py-2 text-left">Source</th>
              <th className="px-4 py-2 text-right print:hidden" />
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                  No holidays for {year}.
                </td>
              </tr>
            )}
            {holidays.map((h) => {
              const s = CHIP_STYLE[chipKind(h)]
              const Icon = s.icon
              return (
                <tr key={h.id} className={cn('border-t border-border', h.cancelled && 'opacity-60')}>
                  <td className="whitespace-nowrap px-4 py-2">
                    <button type="button" className="text-primary hover:underline" onClick={() => onOpenDay(h.date)}>
                      {formatDate(h.date)}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    {h.name}
                    {h.reason && <span className="block text-xs text-text-muted">{h.reason}</span>}
                    {h.cancelled && <span className="block text-xs text-danger-fg">Cancelled{h.cancelReason ? ` — ${h.cancelReason}` : ''}</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', s.chip)}>
                      <Icon className="size-3" aria-hidden /> {s.label}
                    </span>
                    {h.appliesTo !== 'all' && <span className="block text-xs text-text-muted">{APPLIES_LABEL[h.appliesTo]} only</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-text-muted">
                    {h.paid ? 'Paid' : 'Unpaid'} · {h.workAllowed ? 'work allowed' : 'no work'}
                    {h.collectionStops && <span className="block">collection stopped</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-text-muted">{h.source === 'google' ? 'Google' : h.source === 'file' ? 'File' : 'Manual'}</td>
                  <td className="px-4 py-2 text-right print:hidden">
                    {h.canChange && (
                      <div className="flex justify-end gap-1">
                        {h.type !== 'closure' && (
                          <Button size="sm" variant="ghost" onClick={() => onEdit(h)}>
                            Edit
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => onCancel(h)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
