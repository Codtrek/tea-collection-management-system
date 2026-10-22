import { ConflictException, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { localDate } from '../dispatch/dispatch-map';
import { FertilizerAllocationEntity } from './fertilizer-allocation.entity';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import type { AllocationState } from './fertilizer-map';
import type { FertilizerRequestEntity } from './fertilizer-request.entity';
import { StockMovementEntity } from './stock-movement.entity';

export const round2 = (n: number): number => Math.round(n * 100) / 100;
const dec = (n: number): string => String(round2(n));

/** A batch counts toward on-hand and FEFO only while it is neither discarded nor past expiry. */
export function isLive(
  batch: Pick<FertilizerBatchEntity, 'discarded' | 'expiryDate'>,
  today: string,
): boolean {
  return !batch.discarded && batch.expiryDate >= today;
}

export interface FefoTake {
  batchId: number;
  take: number;
}

/**
 * Pure FEFO plan: take from live batches earliest-expiry first (then lowest id), each batch
 * giving at most what isn't already committed to someone else. Null when the batches can't
 * cover `qty` — the caller turns that into a refusal, so no stock is ever promised twice.
 */
export function planFefo(
  batches: readonly FertilizerBatchEntity[],
  activeByBatch: ReadonlyMap<number, number>,
  qty: number,
  today: string,
): FefoTake[] | null {
  const plan: FefoTake[] = [];
  let remaining = round2(qty);
  const live = batches
    .filter((b) => isLive(b, today))
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) || a.id - b.id);
  for (const b of live) {
    if (remaining <= 0) break;
    const free = round2(Number(b.quantityKg) - (activeByBatch.get(b.id) ?? 0));
    if (free <= 0) continue;
    const take = round2(Math.min(free, remaining));
    plan.push({ batchId: b.id, take });
    remaining = round2(remaining - take);
  }
  return remaining > 0 ? null : plan;
}

export interface StockActor {
  name: string;
}

/**
 * Every change to committed / on-hand stock for a request goes through here, inside the
 * caller's transaction (Fertilizer-Delivery-Addendum §5):
 *   allocate  → Available ↓, Committed ↑          (approval)
 *   pick      → On Hand ↓, Committed ↓            (officer's handover to the agent)
 *   giveBack  → On Hand ↑, Committed ↑            (check-in: back in the store, still this owner's)
 *   release   → Committed ↓, Available ↑          (cancel / reject / owner refused)
 * Batch rows are locked (`pessimistic_write`) before any read-then-write, so two approvals
 * racing for the same stock serialise and the second sees what the first took.
 */
@Injectable()
export class FertilizerStockLedger {
  /** Σ ACTIVE allocations of a request — what is committed to it right now. */
  async committedFor(em: EntityManager, requestId: number): Promise<number> {
    const rows = await em
      .getRepository(FertilizerAllocationEntity)
      .find({ where: { requestId, state: 'active' } });
    return round2(rows.reduce((s, r) => s + Number(r.qtyKg), 0));
  }

  /** Commit `qty` of the request's item, FEFO. Throws when Available can't cover it. */
  async allocate(
    em: EntityManager,
    request: FertilizerRequestEntity,
    qty: number,
    now: Date,
  ): Promise<FertilizerAllocationEntity[]> {
    const today = localDate(now);
    const batchRepo = em.getRepository(FertilizerBatchEntity);
    const allocRepo = em.getRepository(FertilizerAllocationEntity);
    const batches = await batchRepo.find({
      where: { item: request.item },
      lock: { mode: 'pessimistic_write' },
    });
    const ids = new Set(batches.map((b) => b.id));
    const active = (
      await allocRepo.find({ where: { state: 'active' } })
    ).filter((a) => ids.has(a.batchId));
    const activeByBatch = new Map<number, number>();
    for (const a of active) {
      activeByBatch.set(
        a.batchId,
        round2((activeByBatch.get(a.batchId) ?? 0) + Number(a.qtyKg)),
      );
    }
    // Available is item-wide: commitments stuck on an expired batch still count against it.
    const onHand = batches
      .filter((b) => isLive(b, today))
      .reduce((s, b) => s + Number(b.quantityKg), 0);
    const committed = active.reduce((s, a) => s + Number(a.qtyKg), 0);
    const available = round2(Math.max(0, onHand - committed));
    const plan =
      qty <= available ? planFefo(batches, activeByBatch, qty, today) : null;
    if (!plan) {
      throw new ConflictException(
        `Only ${available} kg of ${request.item} is available to commit (${round2(qty)} kg needed).`,
      );
    }
    const rows: FertilizerAllocationEntity[] = [];
    for (const p of plan) {
      rows.push(
        await allocRepo.save(
          allocRepo.create({
            requestId: request.id,
            batchId: p.batchId,
            qtyKg: dec(p.take),
            state: 'active',
            createdAt: now,
            updatedAt: now,
          }),
        ),
      );
    }
    return rows;
  }

  /**
   * Make the request's ACTIVE commitment equal `required` again: commitments on a batch
   * that has since expired or been discarded are dropped and re-taken from live stock
   * (FEFO). Throws if live stock can't cover the gap.
   */
  async ensureCommitted(
    em: EntityManager,
    request: FertilizerRequestEntity,
    required: number,
    now: Date,
  ): Promise<void> {
    const today = localDate(now);
    const allocRepo = em.getRepository(FertilizerAllocationEntity);
    const batchRepo = em.getRepository(FertilizerBatchEntity);
    const mine = await allocRepo.find({
      where: { requestId: request.id, state: 'active' },
    });
    let have = 0;
    for (const a of mine) {
      const batch = await batchRepo.findOne({ where: { id: a.batchId } });
      if (!batch || !isLive(batch, today)) {
        a.state = 'released';
        a.updatedAt = now;
        await allocRepo.save(a);
      } else {
        have += Number(a.qtyKg);
      }
    }
    const gap = round2(required - have);
    if (gap > 0) await this.allocate(em, request, gap, now);
  }

  /** Give everything still committed to the request back to general stock. Returns kg released. */
  async release(
    em: EntityManager,
    requestId: number,
    now: Date,
  ): Promise<number> {
    const allocRepo = em.getRepository(FertilizerAllocationEntity);
    const rows = await allocRepo.find({
      where: { requestId, state: 'active' },
    });
    for (const r of rows) {
      r.state = 'released';
      r.updatedAt = now;
      await allocRepo.save(r);
    }
    return round2(rows.reduce((s, r) => s + Number(r.qtyKg), 0));
  }

  /**
   * The officer hands `qty` to the agent: the request's committed stock leaves the store,
   * earliest-expiry first. On Hand and Committed both drop by `qty`.
   */
  async pick(
    em: EntityManager,
    request: FertilizerRequestEntity,
    qty: number,
    actor: StockActor,
    now: Date,
    destination: string,
  ): Promise<void> {
    const moved = await this.shift(em, request, qty, 'active', 'picked', now);
    for (const m of moved) {
      await this.adjustBatch(em, m.batchId, -m.take, actor, now);
      await this.ledger(em, {
        batchId: m.batchId,
        type: 'Outgoing',
        qty: m.take,
        request,
        actor,
        now,
        destination,
        notes: 'Handed to the collection agent',
      });
    }
  }

  /** Check-in: `qty` comes back into the store and stays committed to this owner. */
  async giveBack(
    em: EntityManager,
    request: FertilizerRequestEntity,
    qty: number,
    actor: StockActor,
    now: Date,
  ): Promise<void> {
    const moved = await this.shift(em, request, qty, 'picked', 'active', now);
    for (const m of moved) {
      await this.adjustBatch(em, m.batchId, m.take, actor, now);
      await this.ledger(em, {
        batchId: m.batchId,
        type: 'Incoming',
        qty: m.take,
        request,
        actor,
        now,
        destination: null,
        notes: 'Returned to the factory — still committed to this request',
      });
    }
  }

  /**
   * Move `qty` of the request's allocations from one state to another, splitting a row when
   * only part of it moves. Earliest-expiry batches move first. Throws if there isn't enough.
   */
  private async shift(
    em: EntityManager,
    request: FertilizerRequestEntity,
    qty: number,
    from: AllocationState,
    to: AllocationState,
    now: Date,
  ): Promise<FefoTake[]> {
    const allocRepo = em.getRepository(FertilizerAllocationEntity);
    const batchRepo = em.getRepository(FertilizerBatchEntity);
    const rows = await allocRepo.find({
      where: { requestId: request.id, state: from },
    });
    const expiry = new Map<number, string>();
    for (const r of rows) {
      const b = await batchRepo.findOne({ where: { id: r.batchId } });
      expiry.set(r.batchId, b?.expiryDate ?? '9999-12-31');
    }
    rows.sort(
      (a, b) =>
        expiry.get(a.batchId)!.localeCompare(expiry.get(b.batchId)!) ||
        a.id - b.id,
    );
    const total = round2(rows.reduce((s, r) => s + Number(r.qtyKg), 0));
    if (total < round2(qty)) {
      throw new ConflictException(
        `Only ${total} kg is ${from === 'active' ? 'committed to' : 'out with the agent for'} this request (${round2(qty)} kg given).`,
      );
    }
    const moved: FefoTake[] = [];
    let remaining = round2(qty);
    for (const r of rows) {
      if (remaining <= 0) break;
      const rowQty = Number(r.qtyKg);
      const take = round2(Math.min(rowQty, remaining));
      if (take >= rowQty) {
        r.state = to;
        r.updatedAt = now;
        await allocRepo.save(r);
      } else {
        r.qtyKg = dec(rowQty - take);
        r.updatedAt = now;
        await allocRepo.save(r);
        await allocRepo.save(
          allocRepo.create({
            requestId: request.id,
            batchId: r.batchId,
            qtyKg: dec(take),
            state: to,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }
      moved.push({ batchId: r.batchId, take });
      remaining = round2(remaining - take);
    }
    return moved;
  }

  private async adjustBatch(
    em: EntityManager,
    batchId: number,
    delta: number,
    actor: StockActor,
    now: Date,
  ): Promise<void> {
    const repo = em.getRepository(FertilizerBatchEntity);
    const batch = await repo.findOne({
      where: { id: batchId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!batch) throw new ConflictException(`Batch ${batchId} is missing.`);
    const next = round2(Number(batch.quantityKg) + delta);
    if (next < 0) {
      throw new ConflictException(
        `Batch ${batch.lotNumber ?? batchId} doesn't hold enough stock for this.`,
      );
    }
    batch.quantityKg = dec(next);
    batch.lastUpdatedBy = actor.name;
    batch.lastUpdatedOn = now;
    await repo.save(batch);
  }

  private async ledger(
    em: EntityManager,
    m: {
      batchId: number;
      type: 'Incoming' | 'Outgoing';
      qty: number;
      request: FertilizerRequestEntity;
      actor: StockActor;
      now: Date;
      destination: string | null;
      notes: string;
    },
  ): Promise<void> {
    const repo = em.getRepository(StockMovementEntity);
    await repo.save(
      repo.create({
        batchId: m.batchId,
        type: m.type,
        quantityKg: dec(m.qty),
        movementDate: localDate(m.now),
        destination: m.destination,
        estateId: m.request.estateId,
        linkedRequestId: m.request.id,
        supplier: null,
        notes: m.notes,
        recordedBy: m.actor.name,
      }),
    );
  }
}
