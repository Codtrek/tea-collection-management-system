import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import * as dispatchService from '@/services/dispatch'
import { cn } from '@/lib/cn'
import type { DispatchBoard } from './types'

interface ReassignRouteModalProps {
  open: boolean
  board: DispatchBoard
  /** pre-selected route (the row's own route) */
  routeId: number | null
  /** pre-selected agent (for an agent with no route: "move this agent to a route") */
  agentId: number | null
  /** can the viewer make permanent changes? (dispatch = Approve) */
  canApprove: boolean
  onClose: () => void
}

/*
  Change an agent's route or give a route to another agent: pick the route, the agent who
  should handle it, and whether that is for today only (a one-day cover, effective now) or
  from now on (a permanent change — needs Approve). A route that has already started
  collecting today is BLOCKED here with a clear warning, matching the server's rule.
*/
export function ReassignRouteModal({ open, board, routeId, agentId, canApprove, onClose }: ReassignRouteModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [route, setRoute] = useState(routeId ? String(routeId) : '')
  const [agent, setAgent] = useState(agentId && !routeId ? String(agentId) : '')
  const [scope, setScope] = useState<'today' | 'permanent'>('today')

  const picked = board.routes.find((r) => String(r.routeId) === route)
  const started = !!picked && picked.stopsDone > 0
  const alreadyHandles = !!picked && String(picked.agentId) === agent
  const blocked = started || alreadyHandles || !route || !agent

  const mutation = useMutation({
    mutationFn: () => dispatchService.reassignRoute(Number(route), { agentId: Number(agent), scope }),
    onSuccess: () => {
      const who = board.agents.find((a) => String(a.agentId) === agent)?.name ?? 'the agent'
      toast(scope === 'today' ? `${picked?.name} goes to ${who} for today` : `${picked?.name} now belongs to ${who}`)
      void queryClient.invalidateQueries({ queryKey: ['dispatch'] })
      void queryClient.invalidateQueries({ queryKey: ['collections'] })
      onClose()
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not reassign this route', 'danger'),
  })

  return (
    <LightConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      title="Reassign route"
      confirmLabel={scope === 'today' ? 'Reassign for today' : 'Reassign from now on'}
      loading={mutation.isPending}
      confirmDisabled={blocked}
      message="Pick the route and who should handle it. Pending requests on the route follow the new agent; the change is written to the dispatch audit history."
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Route"
            placeholder="Choose a route"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            options={board.routes.map((r) => ({
              value: String(r.routeId),
              label: `${r.name}${r.agentName ? ` · ${r.agentName}` : ''}`,
            }))}
          />
          <Select
            label="Handled by"
            placeholder="Choose an agent"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            options={board.agents
              .filter((a) => !a.absent)
              .map((a) => ({ value: String(a.agentId), label: a.name }))}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">For how long</legend>
          {(
            [
              ['today', 'Today only', 'A one-day cover that takes effect now; tomorrow the route returns to its owner.'],
              ['permanent', 'From now on', 'Ends the current owner’s assignment and starts a new one.'],
            ] as const
          ).map(([value, label, hint]) => {
            const disabled = value === 'permanent' && !canApprove
            return (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] border border-border p-3',
                  scope === value && 'border-primary bg-brand-soft',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="radio"
                  name="scope"
                  className="mt-0.5 accent-[var(--color-primary)]"
                  checked={scope === value}
                  disabled={disabled}
                  onChange={() => setScope(value)}
                />
                <span>
                  <span className="block text-sm font-medium text-text">{label}</span>
                  <span className="block text-xs text-text-muted">
                    {disabled ? 'Needs permission to approve permanent changes.' : hint}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>

        {started && (
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger-fg/25 bg-danger-bg p-3 text-sm text-danger-fg">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {picked?.name} has already started collecting today ({picked?.stopsDone} of {picked?.stopsTotal} stops done).
            Reassigning it now would orphan the stops already completed — try again tomorrow, or arrange a cover for what is left.
          </p>
        )}
        {alreadyHandles && !started && (
          <p className="text-sm text-text-muted">That agent already handles {picked?.name} today.</p>
        )}
      </div>
    </LightConfirmModal>
  )
}
