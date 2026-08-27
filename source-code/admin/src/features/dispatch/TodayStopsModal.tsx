import { Link } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { COLLECTION_TONE } from '@/features/collections/status'
import { formatWeight } from '@/lib/format'
import type { CollectionRecord } from '@/features/collections/types'
import type { BoardAgent } from './types'

interface TodayStopsModalProps {
  open: boolean
  agent: BoardAgent
  /** route names this agent handles today (own + covered) */
  routeNames: string[]
  date: string
  records: CollectionRecord[]
  onClose: () => void
}

/* Today's stops for an agent: the collection records due today on the routes they handle. */
export function TodayStopsModal({ open, agent, routeNames, date, records, onClose }: TodayStopsModalProps) {
  const stops = records.filter((r) => r.date === date && routeNames.includes(r.route))
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <h2 className="text-base font-semibold text-text-heading">Today’s stops — {agent.name}</h2>
      <p className="mt-1 text-sm text-text-muted">
        {routeNames.length > 0 ? routeNames.join(' + ') : 'No route today'} · {stops.length} stop
        {stops.length === 1 ? '' : 's'}
      </p>
      {stops.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">Nothing is scheduled for this agent today.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-[var(--radius-md)] border border-border">
          {stops.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <Link to={`/collections/${s.id}`} className="block truncate text-sm font-medium text-primary hover:underline">
                  {s.estateName}
                </Link>
                <p className="text-xs text-text-muted">
                  {s.route} · <span className="id">{s.id}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular text-sm text-text">{formatWeight(s.estateWeightKg)}</span>
                <StatusBadge tone={COLLECTION_TONE[s.status]}>{s.status}</StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
