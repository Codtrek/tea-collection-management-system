import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  cancelError,
  newVersionError,
  versionBefore,
  versionStatus,
  type VersionStatus,
} from '../admin/versioning';
import { AuditService } from '../audit/audit.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import { FertilizerItemPriceEntity } from './fertilizer-item-price.entity';
import type { FlowActor } from './fertilizer-journal';
import { StockMovementEntity } from './stock-movement.entity';

const SETUP_HREF = '/admin/factory-setup';
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface PublicPrice {
  id: number;
  item: string;
  /** the per-kg price a request snapshots */
  ratePerKg: number;
  unit: 'kg' | 'bag';
  bagSizeKg: number | null;
  pricePerUnit: number;
  effectiveDate: string;
  setBy: string;
  reason: string | null;
  status: VersionStatus;
  /** the version in force today */
  current: boolean;
  cancelled: { at: string; by: string | null; reason: string | null } | null;
}

/** What the factory paid recently, for comparison with the selling price (information only). */
export interface PurchaseCost {
  item: string;
  /** weighted average Rs per kg over costed stock-ins in the window; null when none */
  avgCostPerKg: number | null;
  stockIns: number;
  since: string;
}

export interface SetPriceInput {
  item: string;
  unit: 'kg' | 'bag';
  bagSizeKg?: number;
  pricePerUnit: number;
  effectiveDate: string;
  reason: string;
}

const COST_WINDOW_DAYS = 90;

/** Rs per kg for a price entered per unit. */
export function perKg(
  unit: 'kg' | 'bag',
  pricePerUnit: number,
  bagSizeKg?: number | null,
): number {
  return unit === 'bag'
    ? r2(pricePerUnit / Number(bagSizeKg))
    : r2(pricePerUnit);
}

/**
 * Item Prices (Administration-Addendum §5) — the ONE selling-price source for fertilizer and other
 * items given to estate owners. Versions follow admin/versioning.ts; approval snapshots the
 * per-kg price in force that day (FertilizerRequestService.currentPrice), so a new price never
 * changes an approved request. Permission: `itemPrices` (edit sets prices; view reads them).
 */
@Injectable()
export class ItemPriceService {
  constructor(
    @InjectRepository(FertilizerItemPriceEntity)
    private readonly prices: Repository<FertilizerItemPriceEntity>,
    @InjectRepository(StockMovementEntity)
    private readonly movements: Repository<StockMovementEntity>,
    @InjectRepository(FertilizerBatchEntity)
    private readonly batches: Repository<FertilizerBatchEntity>,
    private readonly access: DispatchAccessService,
    private readonly audit: AuditService,
  ) {}

  async list(now: Date = new Date()): Promise<PublicPrice[]> {
    const today = localDate(now);
    const rows = await this.prices.find();
    return [...rows]
      .sort(
        (a, b) =>
          a.item.localeCompare(b.item) ||
          b.effectiveDate.localeCompare(a.effectiveDate),
      )
      .map((r) => {
        const status = versionStatus(
          r,
          rows.filter((x) => x.item === r.item),
          today,
        );
        return {
          id: r.id,
          item: r.item,
          ratePerKg: Number(r.ratePerKg),
          unit: r.unit ?? 'kg',
          bagSizeKg:
            r.bagSizeKg === null || r.bagSizeKg === undefined
              ? null
              : Number(r.bagSizeKg),
          pricePerUnit: Number(r.pricePerUnit ?? r.ratePerKg),
          effectiveDate: r.effectiveDate,
          setBy: r.setBy,
          reason: r.reason ?? null,
          status,
          current: status === 'current',
          cancelled: r.cancelledAt
            ? {
                at: new Date(r.cancelledAt).toISOString(),
                by: r.cancelledBy,
                reason: r.cancelReason,
              }
            : null,
        };
      });
  }

  /** A new price version: per kg, or per bag of N kg. Reason required; never in the past. */
  async set(
    input: SetPriceInput,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicPrice[]> {
    await this.access.require(
      actor.role,
      'edit',
      'set item prices',
      'itemPrices',
    );
    const item = input.item.trim();
    if (!item) throw new BadRequestException('Name the item.');
    if (input.unit === 'bag' && !(Number(input.bagSizeKg) > 0)) {
      throw new BadRequestException('Give the bag size in kg.');
    }
    const bag = input.unit === 'bag' ? r2(Number(input.bagSizeKg)) : null;
    const rows = (await this.prices.find()).filter((r) => r.item === item);
    const refusal = newVersionError(
      rows,
      input.effectiveDate,
      localDate(now),
      (v) =>
        (v.unit ?? 'kg') === input.unit &&
        (v.bagSizeKg === null ? null : Number(v.bagSizeKg)) === bag &&
        Number(v.pricePerUnit ?? v.ratePerKg) === input.pricePerUnit,
      `price for ${item}`,
      input.reason,
    );
    if (refusal) {
      throw refusal.kind === 'clash'
        ? new ConflictException(refusal.message)
        : new BadRequestException(refusal.message);
    }
    const before = versionBefore(rows, input.effectiveDate);
    await this.prices.save(
      this.prices.create({
        item,
        unit: input.unit,
        bagSizeKg: bag === null ? null : String(bag),
        pricePerUnit: String(r2(input.pricePerUnit)),
        ratePerKg: String(perKg(input.unit, input.pricePerUnit, bag)),
        effectiveDate: input.effectiveDate,
        setBy: actor.name,
        reason: input.reason.trim(),
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
      }),
    );
    const show = (
      unit: string,
      price: number | string,
      size: number | string | null,
    ) =>
      unit === 'bag'
        ? `Rs. ${Number(price)} per ${Number(size)} kg bag`
        : `Rs. ${Number(price)}/kg`;
    await this.audit.record(actor as never, {
      action: 'Set item price',
      module: 'Administration',
      record: item,
      recordHref: SETUP_HREF,
      details: `${before ? `${show(before.unit ?? 'kg', before.pricePerUnit ?? before.ratePerKg, before.bagSizeKg)} → ` : ''}${show(input.unit, input.pricePerUnit, bag)} from ${input.effectiveDate} — ${input.reason.trim()}`,
    });
    return this.list(now);
  }

  /** Cancel a scheduled price before it starts (kept, audited). */
  async cancel(
    id: number,
    reason: string,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicPrice[]> {
    await this.access.require(
      actor.role,
      'edit',
      'set item prices',
      'itemPrices',
    );
    const row = await this.prices.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Price version ${id} not found.`);
    const why = cancelError(row, localDate(now), reason);
    if (why) throw new BadRequestException(why);
    row.cancelledAt = now;
    row.cancelledBy = actor.name;
    row.cancelReason = reason.trim();
    await this.prices.save(row);
    await this.audit.record(actor as never, {
      action: 'Cancelled scheduled item price',
      module: 'Administration',
      record: row.item,
      recordHref: SETUP_HREF,
      details: `Price from ${row.effectiveDate} — ${reason.trim()}`,
    });
    return this.list(now);
  }

  /**
   * Average purchase cost per kg over the last 90 days of costed stock-ins (kg batches only; a
   * bag batch's cost can't be put per kg without its bag size). Information for the price page.
   */
  async purchaseCosts(now: Date = new Date()): Promise<PurchaseCost[]> {
    const today = localDate(now);
    const since = new Date(`${today}T00:00:00Z`);
    since.setUTCDate(since.getUTCDate() - COST_WINDOW_DAYS);
    const from = since.toISOString().slice(0, 10);
    const [moves, batches] = await Promise.all([
      this.movements.find({ where: { type: 'Incoming' } }),
      this.batches.find(),
    ]);
    const batchOf = new Map(batches.map((b) => [b.id, b]));
    const items = [...new Set(batches.map((b) => b.item))].sort();
    return items.map((item) => {
      const costed = moves.filter((m) => {
        const b = batchOf.get(m.batchId);
        return (
          b?.item === item &&
          b.unit === 'kg' &&
          m.unitCost !== null &&
          m.movementDate >= from &&
          m.movementDate <= today
        );
      });
      const kg = costed.reduce((s, m) => s + Number(m.quantityKg), 0);
      const rs = costed.reduce(
        (s, m) => s + Number(m.quantityKg) * Number(m.unitCost),
        0,
      );
      return {
        item,
        avgCostPerKg: kg > 0 ? r2(rs / kg) : null,
        stockIns: costed.length,
        since: from,
      };
    });
  }
}
