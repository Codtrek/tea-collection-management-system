import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Column } from '@/components/data/DataTable'
import { formatWeight } from '@/lib/format'
import { FreshnessCell } from './FreshnessCell'
import { BOARD_STATUS_TONE } from './status'
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
      render: (a) => <span className="font-medium text-text">{a.name}</span>,
    },
    {
      key: 'route',
      header: 'Route',
      render: (a) => (
        <div className="flex flex-col items-start gap-1">
          <span>{a.routeName ?? <span className="text-text-muted">Unassigned</span>}</span>
          {a.coveringRouteName && <StatusBadge tone="warning">Covering {a.coveringRouteName}</StatusBadge>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge tone={BOARD_STATUS_TONE[a.status]}>{a.status}</StatusBadge>,
    },
    {
      key: 'progress',
      header: 'Collected so far',
      align: 'right',
      sortable: true,
      sortValue: (a) => a.kgCollected,
      render: (a) => (
        <div>
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
      render: (a) => <FreshnessCell agent={a} />,
    },
  ]
}
