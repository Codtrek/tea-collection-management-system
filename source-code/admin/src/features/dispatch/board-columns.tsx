import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Column } from '@/components/data/DataTable'
import { formatWeight } from '@/lib/format'
import { FreshnessCell } from './FreshnessCell'
import { BOARD_STATUS_TONE, otherRoutesNote } from './status'
import type { BoardAgent } from './types'

/*
  Agent list columns for COL-05. Progress leads with "kg collected so far" — estate-level
  weighing exists by design (the agent weighs at the estate), so kg is the honest measure;
  stops done/total sits beneath it.
*/
export function agentColumns(): Column<BoardAgent>[] {
  return [
    {
      key: 'name',
      header: 'Agent',
      sortable: true,
      sortValue: (a) => a.name,
      minWidth: 160,
      render: (a) => <span className="font-medium text-text">{a.name}</span>,
    },
    {
      key: 'route',
      header: 'Route',
      minWidth: 190,
      // Line 1: what the agent runs on the board's date. Line 2: the routes he holds that don't
      // run that day (Route-Schedule-Addendum §5). "Not scheduled" itself lives only in Status.
      render: (a) => {
        const note = otherRoutesNote(a)
        return (
          <div className="flex flex-col items-start gap-1">
            {a.scheduledRoutes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {a.scheduledRoutes.map((r) =>
                  r.covering ? (
                    <StatusBadge key={r.routeId} tone="warning">
                      Covering {r.name}
                    </StatusBadge>
                  ) : (
                    <StatusBadge key={r.routeId} tone="approved">
                      {r.name}
                    </StatusBadge>
                  ),
                )}
              </div>
            )}
            {note && <span className="text-xs text-text-muted">{note}</span>}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: 130,
      render: (a) => <StatusBadge tone={BOARD_STATUS_TONE[a.status]}>{a.status}</StatusBadge>,
    },
    {
      key: 'progress',
      header: 'Collected so far',
      align: 'right',
      sortable: true,
      sortValue: (a) => a.kgCollected,
      minWidth: 120,
      render: (a) => (
        <div className="whitespace-nowrap">
          <p className="tabular">{formatWeight(a.kgCollected)}</p>
          <p className="tabular text-xs text-text-muted">
            {a.stopsDone}/{a.stopsTotal} stops
          </p>
        </div>
      ),
    },
    {
      key: 'lastSeen',
      header: 'Last seen',
      minWidth: 130,
      render: (a) => <FreshnessCell agent={a} />,
    },
  ]
}
