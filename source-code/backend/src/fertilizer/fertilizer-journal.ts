import type { EntityManager } from 'typeorm';
import { assertTransition } from './fertilizer-flow';
import type { DbRequestStatus } from './fertilizer-map';
import { FertilizerRequestEventEntity } from './fertilizer-request-event.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';

/** Who did it — a portal user (Officer / Manager / Administrator), an agent, or the system. */
export interface FlowActor {
  name: string;
  role: string;
  sub?: number | null;
}

export const SYSTEM: FlowActor = { name: 'System', role: 'System' };

/** Append one timeline row (who / what / when / why). */
export async function logEvent(
  em: EntityManager,
  requestId: number,
  actor: FlowActor,
  now: Date,
  e: {
    action: string;
    from?: DbRequestStatus | null;
    to?: DbRequestStatus | null;
    note?: string | null;
    deviceAt?: Date | null;
  },
): Promise<void> {
  const repo = em.getRepository(FertilizerRequestEventEntity);
  await repo.save(
    repo.create({
      requestId,
      at: now,
      deviceAt: e.deviceAt ?? null,
      actor: actor.name,
      actorRole: actor.role,
      action: e.action,
      fromStatus: e.from ?? null,
      toStatus: e.to ?? null,
      note: e.note ?? null,
    }),
  );
}

/**
 * THE way a request changes status: checks the move against the state machine, saves the
 * request, and writes the timeline row — so no status change can happen without one.
 */
export async function moveTo(
  em: EntityManager,
  request: FertilizerRequestEntity,
  to: DbRequestStatus,
  actor: FlowActor,
  now: Date,
  e: { action: string; note?: string | null; deviceAt?: Date | null },
): Promise<void> {
  const from = request.status;
  assertTransition(from, to);
  request.status = to;
  request.updatedAt = now;
  await em.getRepository(FertilizerRequestEntity).save(request);
  await logEvent(em, request.id, actor, now, { ...e, from, to });
}
