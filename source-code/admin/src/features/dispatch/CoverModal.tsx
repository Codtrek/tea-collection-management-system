import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import * as dispatchService from '@/services/dispatch'
import { formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { BoardAgent, CoverCandidate } from './types'

interface CoverModalProps {
  open: boolean
  /** the agent who is (or is about to be marked) absent */
  agent: BoardAgent
  onClose: () => void
}

/*
  Absence cover. Stage 1 (only if the agent isn't marked absent yet): confirm the absence.
  Stage 2: the system RANKS candidates — neighbouring routes first, then least work — and
  the officer picks one; nothing is auto-assigned. The request waits for the candidate to
  accept (or time out, after which the board offers the next one). Exceeding a candidate's
  usual best day is a warning, never a block.
*/
export function CoverModal({ open, agent, onClose }: CoverModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [reason, setReason] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  const absent = agent.absent
  const routeId = agent.routeId

  const candidates = useQuery({
    queryKey: ['dispatch', 'candidates', routeId],
    queryFn: () => dispatchService.getCoverCandidates(routeId!),
    enabled: open && absent && routeId !== null,
    staleTime: 0,
  })

  const absentMutation = useMutation({
    mutationFn: () => dispatchService.markAbsent(agent.agentId, reason.trim() || undefined),
    onSuccess: () => {
      toast(`${agent.name} marked absent`)
      void queryClient.invalidateQueries({ queryKey: ['dispatch'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not mark this agent absent', 'danger'),
  })

  const list = candidates.data ?? []
  // the first candidate not yet asked today is the system's suggestion
  const suggested = list.find((c) => !c.previouslyAsked)?.agentId ?? null
  const chosen = picked ?? suggested

  const coverMutation = useMutation({
    mutationFn: () => dispatchService.sendCoverRequest({ routeId: routeId!, agentId: chosen! }),
    onSuccess: () => {
      const who = list.find((c) => c.agentId === chosen)?.name ?? 'the agent'
      toast(`Cover request sent to ${who} — waiting for an answer`)
      void queryClient.invalidateQueries({ queryKey: ['dispatch'] })
      onClose()
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not send the request', 'danger'),
  })

  if (!absent) {
    return (
      <LightConfirmModal
        open={open}
        onClose={onClose}
        onConfirm={() => absentMutation.mutate()}
        title={`Mark ${agent.name} absent?`}
        confirmLabel="Mark absent"
        loading={absentMutation.isPending}
        message="Their route’s requests stay with them until someone accepts a cover. You can mark them available again at any time."
      >
        <Input
          label="Reason (optional)"
          placeholder="e.g. sick, vehicle breakdown"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </LightConfirmModal>
    )
  }

  return (
    <LightConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={() => coverMutation.mutate()}
      title={`Find cover for ${agent.routeName ?? 'this route'}`}
      confirmLabel={chosen ? `Send request to ${list.find((c) => c.agentId === chosen)?.name ?? 'agent'}` : 'Send request'}
      loading={coverMutation.isPending}
      confirmDisabled={!chosen || routeId === null}
      message={
        routeId === null
          ? `${agent.name} has no route of their own to cover.`
          : `${agent.name} is absent. Ranked by neighbouring routes first, then least work — you choose; nobody is assigned until they accept.`
      }
    >
      {routeId !== null && (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Cover candidates">
          {candidates.isPending && <p className="text-sm text-text-muted">Finding candidates…</p>}
          {candidates.isError && <p className="text-sm text-danger-fg">Could not load candidates.</p>}
          {candidates.isSuccess && list.length === 0 && (
            <p className="text-sm text-text-muted">
              No agent is free to cover — everyone is absent, finished, or already covering a route today.
            </p>
          )}
          {list.map((c) => (
            <CandidateRow key={c.agentId} c={c} selected={chosen === c.agentId} onSelect={() => setPicked(c.agentId)} />
          ))}
        </div>
      )}
    </LightConfirmModal>
  )
}

function CandidateRow({ c, selected, onSelect }: { c: CoverCandidate; selected: boolean; onSelect: () => void }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-border p-3',
        selected && 'border-primary bg-brand-soft',
        c.previouslyAsked && 'opacity-75',
      )}
    >
      <input
        type="radio"
        name="candidate"
        className="mt-1 accent-[var(--color-primary)]"
        checked={selected}
        onChange={onSelect}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-text">{c.name}</span>
          {c.neighbour ? (
            <StatusBadge tone="success">Neighbouring route</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">{c.ownRouteName ? 'Not adjacent' : 'No route of their own'}</StatusBadge>
          )}
          {c.previouslyAsked && <StatusBadge tone="neutral">Asked earlier today</StatusBadge>}
        </span>
        <span className="tabular mt-0.5 block text-xs text-text-muted">
          {c.ownRouteName ?? 'Free today'} · {c.remainingStops} stop{c.remainingStops === 1 ? '' : 's'} left · usually{' '}
          {formatWeight(c.ownExpectedKg)} + this route {formatWeight(c.coverExpectedKg)}
        </span>
        {c.overCeiling && (
          <span className="mt-1 flex items-start gap-1.5 text-xs text-warning-fg">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
            Together that is more than their best recent day ({formatWeight(c.ceilingKg)}). A warning only — you can still ask.
          </span>
        )}
      </span>
    </label>
  )
}
