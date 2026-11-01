import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { FertilizerChargeEntity } from '../fertilizer/fertilizer-charge.entity';
import { formatChargeId } from '../fertilizer/fertilizer-map';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { formatEstateId, toAppAdvanceStatus } from './estate-map';
import { EstateOwnerEntity } from './estate-owner.entity';
import { EstateEntity } from './estate.entity';
import { EstatesService } from './estates.service';
import { RouteEntity } from './route.entity';
import {
  ALL_PERIODS,
  applyFilters,
  type EstateFacts,
  paginate,
  rowsInPeriod,
  type SettlementListResult,
  type SettlementQuery,
  type SettlementRow,
  settledMonths,
  sortRows,
  summarize,
  toSettlementRow,
  unsettledEstateIds,
} from './settlement-view';

export interface UnsettledOwner {
  estateId: string;
  estateName: string;
  ownerName: string;
  route: string;
  paymentMethod: EstateFacts['paymentMethod'];
  deliveries: number;
  gradedKg: number;
}

export interface SettlementDetail {
  settlement: SettlementRow;
  deliveries: {
    id: string;
    date: string;
    superKg: number;
    normalKg: number;
    /** linked as paid by this settlement (set when it was processed) */
    paid: boolean;
  }[];
  fertilizerCharges: {
    id: string;
    date: string;
    quantityKg: number;
    ratePerKg: number;
    totalCharge: number;
    recovered: boolean;
  }[];
  advances: {
    id: string;
    dateIssued: string;
    amount: number;
    reason: string;
    status: ReturnType<typeof toAppAdvanceStatus>;
  }[];
}

/**
 * Settlement period view (Settlement-Period-View-Addendum): the EST-07 list scoped to a month,
 * its summary, the "owners not yet settled" list and one settlement's detail. Read-only; the
 * figures come from `EstatesService.listSettlements` (stored rows + pending adjustments), so
 * nothing about how a settlement is calculated changes.
 */
@Injectable()
export class SettlementViewService {
  constructor(
    private readonly estates: EstatesService,
    @InjectRepository(EstateEntity)
    private readonly estateRepo: Repository<EstateEntity>,
    @InjectRepository(EstateOwnerEntity)
    private readonly ownerRepo: Repository<EstateOwnerEntity>,
    @InjectRepository(RouteEntity)
    private readonly routeRepo: Repository<RouteEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly collectionRepo: Repository<CollectionRecordEntity>,
    @InjectRepository(FertilizerChargeEntity)
    private readonly chargeRepo: Repository<FertilizerChargeEntity>,
    @InjectRepository(EstateAdvanceEntity)
    private readonly advanceRepo: Repository<EstateAdvanceEntity>,
  ) {}

  async list(q: SettlementQuery): Promise<SettlementListResult> {
    const facts = await this.estateFacts();
    const all = await this.allRows(facts);
    const periodRows = rowsInPeriod(all, q.month);
    const months = settledMonths(all);
    const notYetSettled =
      q.month === ALL_PERIODS
        ? null
        : (await this.unsettledIds(facts, periodRows, q.month)).length;
    const activeOwners = [...facts.values()].filter((f) => f.active).length;

    const filtered = sortRows(applyFilters(periodRows, q), q.sort, q.dir);
    const routes = (await this.routeRepo.find())
      .map((r) => ({ id: r.id, name: r.name ?? '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      ...paginate(filtered, q.page, q.limit),
      summary: summarize(
        periodRows,
        q.month,
        activeOwners,
        notYetSettled,
        months[0] ?? null,
      ),
      months,
      routes,
    };
  }

  async unsettled(month: string): Promise<UnsettledOwner[]> {
    const facts = await this.estateFacts();
    const periodRows = rowsInPeriod(await this.allRows(facts), month);
    const ids = await this.unsettledIds(facts, periodRows, month);
    const deliveries = (
      await this.collectionRepo.find({ where: { status: 'confirmed' } })
    ).filter((d) => d.collectionDate.slice(0, 7) === month);
    const estates = await this.estateRepo.find();
    return ids.map((id) => {
      const f = facts.get(id)!;
      const own = deliveries.filter((d) => d.estateId === id);
      return {
        estateId: formatEstateId(id),
        estateName: estates.find((e) => e.id === id)?.name ?? '',
        ownerName: f.ownerName,
        route: f.route,
        paymentMethod: f.paymentMethod,
        deliveries: own.length,
        gradedKg:
          Math.round(
            own.reduce(
              (s, d) =>
                s +
                (d.gradeLines ?? []).reduce(
                  (t, l) => t + Number(l.weightKg),
                  0,
                ),
              0,
            ) * 100,
          ) / 100,
      };
    });
  }

  async detail(id: string): Promise<SettlementDetail> {
    const facts = await this.estateFacts();
    const settlement = (await this.allRows(facts)).find((r) => r.id === id);
    if (!settlement) throw new NotFoundException(`No settlement "${id}".`);
    const estateId = Number(settlement.estateId.replace(/^EST-/, ''));

    const deliveries = (
      await this.collectionRepo.find({
        where: { estateId, status: 'confirmed' },
      })
    )
      .filter((d) => d.collectionDate.slice(0, 7) === settlement.month)
      .sort((a, b) => a.collectionDate.localeCompare(b.collectionDate))
      .map((d) => {
        const kg = (grade: string) =>
          (d.gradeLines ?? [])
            .filter((l) => l.grade === grade)
            .reduce((s, l) => s + Number(l.weightKg), 0);
        return {
          id: d.id,
          date: d.collectionDate,
          superKg: kg('super'),
          normalKg: kg('normal'),
          paid: d.settlementId === settlement.id,
        };
      });

    // recovered by THIS settlement; a pending one previews the estate's outstanding deduct charges
    const charges = (await this.chargeRepo.find({ where: { estateId } }))
      .filter((c) =>
        settlement.status === 'Processed'
          ? c.settlementId === settlement.id
          : c.settlementId === null &&
            (c.paymentMethod ?? 'deduct') === 'deduct',
      )
      .map((c) => ({
        id: formatChargeId(c.id),
        date: c.calculatedAt.toISOString(),
        quantityKg: Number(c.quantityKg),
        ratePerKg: Number(c.ratePerKg),
        totalCharge: Number(c.totalCharge),
        recovered: c.settlementId !== null,
      }));

    const advances = (await this.advanceRepo.find({ where: { estateId } }))
      .filter((a) =>
        settlement.status === 'Processed'
          ? a.dateIssued.slice(0, 7) <= settlement.month &&
            a.status === 'deducted'
          : a.status === 'pending_deduction',
      )
      .sort((a, b) => b.dateIssued.localeCompare(a.dateIssued))
      .map((a) => ({
        id: a.id,
        dateIssued: a.dateIssued,
        amount: Number(a.amount),
        reason: a.reason,
        status: toAppAdvanceStatus(a.status),
      }));

    return { settlement, deliveries, fertilizerCharges: charges, advances };
  }

  private async allRows(
    facts: Map<number, EstateFacts>,
  ): Promise<SettlementRow[]> {
    const settlements = await this.estates.listSettlements();
    return settlements.map((s) =>
      toSettlementRow(s, facts.get(Number(s.estateId.replace(/^EST-/, '')))),
    );
  }

  private async unsettledIds(
    facts: Map<number, EstateFacts>,
    periodRows: SettlementRow[],
    month: string,
  ): Promise<number[]> {
    const deliveries = await this.collectionRepo.find({
      where: { status: 'confirmed' },
    });
    return unsettledEstateIds(facts, deliveries, periodRows, month);
  }

  private async estateFacts(): Promise<Map<number, EstateFacts>> {
    const [estates, owners] = await Promise.all([
      this.estateRepo.find(),
      this.ownerRepo.find(),
    ]);
    return new Map(
      estates.map((e) => [
        e.id,
        {
          ownerName: owners.find((o) => o.id === e.ownerId)?.name ?? 'Unknown',
          routeId: e.routeId,
          route: e.routeName ?? '',
          paymentMethod: e.paymentMethod ?? 'bank',
          active: e.status === 'active',
        },
      ]),
    );
  }
}
