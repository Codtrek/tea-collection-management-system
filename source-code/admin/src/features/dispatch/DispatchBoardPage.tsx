import { lazy, Suspense, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, ListChecks, Loader2, MapPin, RefreshCw, UserCheck, UserX, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, RowAction } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { AlertList, type AlertListItem } from '@/components/patterns/AlertList'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as collectionsService from '@/services/collections'
import * as dispatchService from '@/services/dispatch'
import { agentColumns } from './board-columns'
import { CoverModal } from './CoverModal'
import { ReassignRouteModal } from './ReassignRouteModal'
import { TodayStopsModal } from './TodayStopsModal'
import type { BoardAgent } from './types'

// Leaflet is the heaviest dependency on this page — load it only when the board opens.
const DispatchMap = lazy(() => import('./DispatchMap').then((m) => ({ default: m.DispatchMap })))

const POLL_MS = 30_000

type Dialog =
  | { kind: 'reassign'; agent: BoardAgent | null; routeId: number | null }
  | { kind: 'cover'; agent: BoardAgent }
  | { kind: 'stops'; agent: BoardAgent }
  | null

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/*
  COL-05 — Agent Dispatch Board. Left: the agents, their routes, status, kg collected so far
  and how fresh their last location is. Right: a map of pins + route lines. Positions are
  LAST KNOWN fixes from agents' phones during a shift — the page says how old they are and
  refreshes every 30 s; it never claims to be live. Permissions are data-driven: view = see
  the board · edit = mark absent / send cover / reassign for today · approve = permanent change.
*/
export function DispatchBoardPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { can } = useAuth()
  const canEdit = can('dispatch', 'edit')
  const canApprove = can('dispatch', 'approve')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)

  const board = useQuery({
    queryKey: ['dispatch', 'board'],
    queryFn: dispatchService.getBoard,
    refetchInterval: POLL_MS,
  })
  // only needed for "View today's stops" — fetched lazily when that dialog opens
  const records = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsService.list,
    enabled: dialog?.kind === 'stops',
  })

  const availableMutation = useMutation({
    mutationFn: (agentId: number) => dispatchService.markAvailable(agentId),
    onSuccess: () => {
      toast('Marked available — any cover on their route ends')
      void queryClient.invalidateQueries({ queryKey: ['dispatch'] })
      void queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not update this agent', 'danger'),
  })

  const data = board.data
  const columns = useMemo(() => agentColumns(), [])

  const alerts = useMemo<AlertListItem[]>(() => {
    if (!data) return []
    const items: AlertListItem[] = []
    const byId = new Map(data.agents.map((a) => [a.agentId, a]))

    // a route whose handling agent is absent and has no cover → needs action
    for (const r of data.routes) {
      const owner = r.agentId !== null ? byId.get(r.agentId) : undefined
      if (!owner?.absent || r.covered) continue
      const pending = data.coverRequests.find((c) => c.routeId === r.routeId && c.status === 'PENDING')
      const lapsed = data.coverRequests.filter((c) => c.routeId === r.routeId && c.status !== 'PENDING')
      if (pending) {
        items.push({
          key: `pending-${pending.id}`,
          urgency: 'warning',
          title: `Waiting for ${pending.agentName} to answer for ${r.name}`,
          detail: `Asked by ${pending.requestedBy}${pending.expiresAt ? ` — lapses at ${fmtTime(pending.expiresAt)}` : ''}. ${owner.name} is absent.`,
        })
      } else {
        items.push({
          key: `uncovered-${r.routeId}`,
          urgency: 'critical',
          title: `${r.name} has no agent today`,
          detail: lapsed.length
            ? `${lapsed.map((c) => `${c.agentName} ${c.status === 'DECLINED' ? 'declined' : 'did not answer'}`).join('; ')}. Ask the next candidate.`
            : `${owner.name} is absent and nobody is covering.`,
          actions: canEdit ? (
            <Button size="sm" onClick={() => setDialog({ kind: 'cover', agent: owner })}>
              {lapsed.length ? 'Ask next candidate' : 'Find cover'}
            </Button>
          ) : undefined,
        })
      }
    }

    // not checked in by the shift-start cutoff — an alert, never automatic absence
    for (const m of data.missedCheckins) {
      const agent = byId.get(m.agentId)
      items.push({
        key: `missed-${m.agentId}`,
        urgency: 'warning',
        title: `${m.name} hasn’t started a shift`,
        detail: `${m.routeName ?? 'No route'} — expected by ${m.shiftStartTime}. This is an alert, not an absence.`,
        actions:
          canEdit && agent ? (
            <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'cover', agent })}>
              Mark absent
            </Button>
          ) : undefined,
      })
    }
    return items
  }, [data, canEdit])

  const selectedAgent = data?.agents.find((a) => a.agentId === selectedId) ?? null
  const routeNamesFor = (agent: BoardAgent) => (data?.routes ?? []).filter((r) => r.agentId === agent.agentId).map((r) => r.name)

  return (
    <div>
      <PageHeader
        title="Agent Dispatch"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Tea Leaf Collection', to: '/collections' },
          { label: 'Agent Dispatch' },
        ]}
        description="Where each collection agent is, which route they handle, and who is covering for whom. Locations are last-known fixes from agents on shift — check the age beside each."
        actions={
          <div className="flex items-center gap-2">
            {data && (
              <span className="tabular hidden text-xs text-text-muted sm:inline">
                Updated {fmtTime(data.generatedAt)} · refreshes every 30 s
              </span>
            )}
            <Button variant="secondary" onClick={() => void board.refetch()} loading={board.isFetching && !board.isPending}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            {canEdit && (
              <Button onClick={() => setDialog({ kind: 'reassign', agent: null, routeId: null })}>
                <ArrowLeftRight className="size-4" /> Reassign Route
              </Button>
            )}
          </div>
        }
      />

      {board.isPending ? (
        <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface py-16">
          <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
        </div>
      ) : board.isError || !data ? (
        <ErrorState onRetry={() => void board.refetch()} />
      ) : (
        <>
          {alerts.length > 0 && <AlertList items={alerts} className="mb-4" />}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <DataTable
              columns={columns}
              rows={data.agents}
              rowKey={(a) => String(a.agentId)}
              pageSize={8}
              onRowClick={(a) => setSelectedId(a.agentId)}
              highlightRowKey={selectedId !== null ? String(selectedId) : undefined}
              emptyState={
                <EmptyState
                  icon={<Users className="size-6" strokeWidth={1.5} />}
                  title="No collection agents yet"
                  description="Agents appear here once they are registered with the factory."
                />
              }
              actions={(a) => (
                <>
                  <RowAction icon={<ListChecks className="size-4" />} label="View today’s stops" onClick={() => setDialog({ kind: 'stops', agent: a })} />
                  {canEdit && (
                    <RowAction
                      icon={<ArrowLeftRight className="size-4" />}
                      label="Reassign route"
                      onClick={() => setDialog({ kind: 'reassign', agent: a, routeId: a.routeId })}
                    />
                  )}
                  {canEdit &&
                    (a.absent ? (
                      <>
                        <RowAction icon={<UserX className="size-4" />} label="Find cover" onClick={() => setDialog({ kind: 'cover', agent: a })} />
                        <RowAction
                          icon={<UserCheck className="size-4" />}
                          label="Mark available"
                          onClick={() => availableMutation.mutate(a.agentId)}
                        />
                      </>
                    ) : (
                      <RowAction icon={<UserX className="size-4" />} label="Mark absent / find cover" tone="danger" onClick={() => setDialog({ kind: 'cover', agent: a })} />
                    ))}
                </>
              )}
            />

            <section
              aria-label="Agent locations map"
              className="relative h-[420px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface xl:sticky xl:top-4 xl:h-[560px]"
            >
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-text-muted">
                    <Loader2 className="size-6 animate-spin" aria-hidden />
                  </div>
                }
              >
                <DispatchMap board={data} selectedAgentId={selectedId} onSelectAgent={setSelectedId} />
              </Suspense>
              {!data.agents.some((a) => a.position) && (
                <p className="pointer-events-none absolute inset-x-4 top-4 z-[500] flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface/95 px-3 py-2 text-sm text-text-muted shadow-[var(--shadow-1)]">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  No agent has shared a location yet — pins appear once agents start their shift.
                </p>
              )}
            </section>
          </div>

          {dialog?.kind === 'reassign' && (
            <ReassignRouteModal
              key={`${dialog.agent?.agentId ?? 'any'}-${dialog.routeId ?? 'any'}`}
              open
              board={data}
              routeId={dialog.routeId}
              agentId={dialog.agent?.agentId ?? null}
              canApprove={canApprove}
              onClose={() => setDialog(null)}
            />
          )}
          {dialog?.kind === 'cover' && (
            <CoverModal
              key={`${dialog.agent.agentId}-${dialog.agent.absent}`}
              open
              // the live row, so the modal advances from "mark absent" to "find cover" once the board refreshes
              agent={data.agents.find((a) => a.agentId === dialog.agent.agentId) ?? dialog.agent}
              onClose={() => setDialog(null)}
            />
          )}
          {dialog?.kind === 'stops' && (
            <TodayStopsModal
              open
              agent={dialog.agent}
              routeNames={routeNamesFor(dialog.agent)}
              date={data.date}
              records={records.data ?? []}
              onClose={() => setDialog(null)}
            />
          )}

          {selectedAgent && (
            <p className="mt-3 text-xs text-text-muted">
              Showing {selectedAgent.name}’s route on the map. Click another agent, or a pin, to switch.
            </p>
          )}
        </>
      )}
    </div>
  )
}
