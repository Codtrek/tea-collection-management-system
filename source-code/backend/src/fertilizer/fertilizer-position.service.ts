import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { localDate } from '../dispatch/dispatch-map';
import { FertilizerAllocationEntity } from './fertilizer-allocation.entity';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import {
  formatBatchId,
  type BatchStatus,
  type CoverageStatus,
  type PublicItemPosition,
  type PublicRequestAvailability,
} from './fertilizer-map';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { FertilizerSettingsService } from './fertilizer-settings.service';
import { isLive, planFefo, round2 } from './fertilizer-stock-ledger.service';

/** Everything a stock figure depends on, loaded once and shared by every caller in a request. */
export interface StockSnapshot {
  today: string;
  windowDays: number;
  batches: FertilizerBatchEntity[];
  /** batch id → kg promised by ACTIVE allocations */
  activeByBatch: Map<number, number>;
  positions: Map<string, PublicItemPosition>;
}

/** Whole days from `today` to `date` (both 'YYYY-MM-DD'); negative once past. */
export function daysUntil(today: string, date: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
}

export function batchStatusOf(
  batch: Pick<FertilizerBatchEntity, 'discarded' | 'expiryDate'>,
  today: string,
  windowDays: number,
): BatchStatus {
  if (batch.discarded) return 'Discarded';
  const days = daysUntil(today, batch.expiryDate);
  if (days < 0) return 'Expired';
  return days <= windowDays ? 'Expiring soon' : 'Fresh';
}

/**
 * FERT-01 status, worst condition first (Fertilizer-Delivery-Addendum §5):
 * Out of stock → Short X kg → Fully committed → Expiring soon → Healthy.
 */
export function positionStatus(p: {
  available: number;
  pendingDemand: number;
  expiringSoonKg: number;
}): { status: CoverageStatus; shortKg: number } {
  const short = round2(p.pendingDemand - p.available);
  if (p.pendingDemand > 0 && p.available <= 0)
    return { status: 'Out of stock', shortKg: short };
  if (p.pendingDemand > p.available || p.available < 0)
    return { status: 'Short', shortKg: short };
  if (p.available === 0) return { status: 'Fully committed', shortKg: 0 };
  if (p.expiringSoonKg > 0) return { status: 'Expiring soon', shortKg: 0 };
  return { status: 'Healthy', shortKg: 0 };
}

/**
 * The single source of fertilizer stock truth: On Hand (live only), expired, committed,
 * available, pending, expiring soon, status — and, from the same numbers, whether a request
 * can be met and from which batches. FERT-01, its summary cards, the batch list, Expiry Alerts,
 * FERT-05 and FERT-06 all read this; the portal computes none of it.
 */
@Injectable()
export class FertilizerPositionService {
  constructor(
    @InjectRepository(FertilizerBatchEntity)
    private readonly batches: Repository<FertilizerBatchEntity>,
    @InjectRepository(FertilizerRequestEntity)
    private readonly requests: Repository<FertilizerRequestEntity>,
    @InjectRepository(FertilizerAllocationEntity)
    private readonly allocations: Repository<FertilizerAllocationEntity>,
    private readonly settings: FertilizerSettingsService,
  ) {}

  async snapshot(now: Date = new Date()): Promise<StockSnapshot> {
    const today = localDate(now);
    const [batches, requests, active, settings] = await Promise.all([
      this.batches.find(),
      this.requests.find(),
      this.allocations.find({ where: { state: 'active' } }),
      this.settings.get(),
    ]);
    const windowDays = settings.expiringSoonDays;
    const activeByBatch = new Map<number, number>();
    for (const a of active) {
      activeByBatch.set(
        a.batchId,
        round2((activeByBatch.get(a.batchId) ?? 0) + Number(a.qtyKg)),
      );
    }
    const itemOfBatch = new Map(batches.map((b) => [b.id, b.item]));
    const rateOfRequest = new Map(
      requests.map((r) => [
        r.id,
        r.ratePerKg !== null ? Number(r.ratePerKg) : 0,
      ]),
    );

    const positions = new Map<string, PublicItemPosition>();
    for (const item of [...new Set(batches.map((b) => b.item))]) {
      const own = batches.filter((b) => b.item === item);
      const live = own.filter((b) => isLive(b, today));
      const sum = (rows: FertilizerBatchEntity[]) =>
        round2(rows.reduce((s, b) => s + Number(b.quantityKg), 0));
      const onHand = sum(live);
      const expiredKg = sum(
        own.filter((b) => !b.discarded && b.expiryDate < today),
      );
      const expiringSoonKg = sum(
        live.filter((b) => daysUntil(today, b.expiryDate) <= windowDays),
      );
      const mine = active.filter((a) => itemOfBatch.get(a.batchId) === item);
      const committed = round2(mine.reduce((s, a) => s + Number(a.qtyKg), 0));
      const committedValueRs = round2(
        mine.reduce(
          (s, a) => s + Number(a.qtyKg) * (rateOfRequest.get(a.requestId) ?? 0),
          0,
        ),
      );
      const available = round2(onHand - committed);
      const pending = requests.filter(
        (r) => r.item === item && r.status === 'Requested',
      );
      const pendingDemand = round2(
        pending.reduce((s, r) => s + Number(r.quantityKg), 0),
      );
      const nearestExpiry = live.map((b) => b.expiryDate).sort()[0] ?? null;
      positions.set(item, {
        item,
        category: own[0].category,
        onHand,
        expiredKg,
        committed,
        committedValueRs,
        available,
        pendingDemand,
        pendingCount: pending.length,
        expiringSoonKg,
        nearestExpiry,
        coverageRatio: pendingDemand > 0 ? available / pendingDemand : null,
        ...positionStatus({ available, pendingDemand, expiringSoonKg }),
        expiringSoonDays: windowDays,
      });
    }
    return { today, windowDays, batches, activeByBatch, positions };
  }

  async listPositions(now: Date = new Date()): Promise<PublicItemPosition[]> {
    return [...(await this.snapshot(now)).positions.values()];
  }

  /** A batch's state on the factory calendar, with what's still free of it. */
  batchView(
    batch: FertilizerBatchEntity,
    snap: StockSnapshot,
  ): { status: BatchStatus; daysToExpiry: number; freeKg: number } {
    return {
      status: batchStatusOf(batch, snap.today, snap.windowDays),
      daysToExpiry: daysUntil(snap.today, batch.expiryDate),
      freeKg: Math.max(
        0,
        round2(
          Number(batch.quantityKg) - (snap.activeByBatch.get(batch.id) ?? 0),
        ),
      ),
    };
  }

  /**
   * Whether a Requested request can be met now, from the same figures as FERT-01: Available
   * from the item's position, batches from FEFO over FREE stock (an expiring batch already
   * promised to someone else doesn't make this request "expiring").
   */
  availabilityOf(
    request: Pick<FertilizerRequestEntity, 'item' | 'quantityKg'>,
    snap: StockSnapshot,
  ): PublicRequestAvailability {
    const position = snap.positions.get(request.item);
    const available = position?.available ?? 0;
    if (available <= 0) {
      return {
        verdict: position && position.expiredKg > 0 ? 'none-expired' : 'none',
        available,
        fefo: [],
        expiringBatch: null,
      };
    }
    const qty = Number(request.quantityKg);
    const own = snap.batches.filter((b) => b.item === request.item);
    const byId = new Map(own.map((b) => [b.id, b]));
    const plan =
      planFefo(own, snap.activeByBatch, Math.min(qty, available), snap.today) ??
      [];
    const fefo = plan.map((t) => {
      const b = byId.get(t.batchId)!;
      return {
        batchId: formatBatchId(b.id),
        lotNumber: b.lotNumber ?? '',
        expiryDate: b.expiryDate,
        daysToExpiry: daysUntil(snap.today, b.expiryDate),
        take: t.take,
      };
    });
    const soon = fefo.find((f) => f.daysToExpiry <= snap.windowDays);
    return {
      verdict:
        available < qty ? 'partial' : soon ? 'covered-expiring' : 'covered',
      available,
      fefo,
      expiringBatch: soon
        ? { expiryDate: soon.expiryDate, daysToExpiry: soon.daysToExpiry }
        : null,
    };
  }
}
