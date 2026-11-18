import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import { agentColumns } from './board-columns'
import type { BoardAgent } from './types'

/** One row action, shared by the table's icon buttons and the cards' menu. */
export interface AgentAction {
  key: string
  icon: ReactNode
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
}

const columns = agentColumns()
const cell = (key: string, a: BoardAgent) => columns.find((c) => c.key === key)?.render?.(a)

/*
  COL-05 below 768px: the agent table becomes a card per agent — agent, route, status, last seen
  and an actions menu. The cells are the table's own renderers, so the two can't drift apart.
*/
export function AgentCardList({
  agents,
  selectedId,
  onSelect,
  actionsFor,
  empty,
}: {
  agents: BoardAgent[]
  selectedId: number | null
  onSelect: (agentId: number) => void
  actionsFor: (agent: BoardAgent) => AgentAction[]
  empty: ReactNode
}) {
  if (agents.length === 0) return <>{empty}</>
  return (
    <ul data-testid="agent-cards" className="flex flex-col gap-2 md:hidden">
      {agents.map((a) => {
        const actions = actionsFor(a)
        return (
          <li
            key={a.agentId}
            className={cn(
              'rounded-[var(--radius-lg)] border bg-surface p-3',
              a.agentId === selectedId ? 'border-primary' : 'border-border',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => onSelect(a.agentId)} className="min-w-0 text-left">
                <span className="block truncate font-medium text-text">{a.name}</span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                {cell('status', a)}
                {actions.length > 0 && (
                  <Popover
                    panelClassName="w-56 py-1"
                    trigger={() => (
                      <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover hover:text-text">
                        <MoreHorizontal className="size-4" aria-hidden />
                        <span className="sr-only">Actions for {a.name}</span>
                      </span>
                    )}
                  >
                    {(close) => (
                      <ul>
                        {actions.map((act) => (
                          <li key={act.key}>
                            <button
                              type="button"
                              onClick={() => {
                                close()
                                act.onClick()
                              }}
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover',
                                act.tone === 'danger' ? 'text-danger-fg' : 'text-text',
                              )}
                            >
                              <span className="text-text-muted [&>svg]:size-4">{act.icon}</span>
                              {act.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Popover>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">{cell('route', a)}</div>
              {cell('lastSeen', a)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
