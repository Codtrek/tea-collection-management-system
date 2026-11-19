import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { FertilizerChargeEntity } from '../fertilizer/fertilizer-charge.entity';
import { formatChargeId } from '../fertilizer/fertilizer-map';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { toAppAdvanceStatus } from './estate-map';
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
} from './settlement-view';
import { SettlementGeneratorService } from './settlement-generator.service';
import type { SettlementCalculation } from './settlement-generator';
import { SettlementEntity } from './settlement.entity';
import { SystemSettingEntity } from '../admin/system-setting.entity';

/** An estate with deliveries in the month and no settlement yet — and why. */
export interface UnsettledOwner {
  estateId: string;
  estateName: string;
  ownerName: string;
  route: string;
  paymentMethod: EstateFacts['paymentMethod'];
  /** payable deliveries (a draft would pay for these) */
  deliveries: number;
  gradedKg: number;
  /** 'not_prepared' = Prepare settlements makes its draft; 'waiting' = nothing payable yet */
  state: 'not_prepared' | 'waiting';
  reason: string;
}

/** The owner statement's letterhead and addressee (Settlement-Addendum). */
export interface StatementParties {
  factory: {
    name: string;
    address: string;
    contact: string;
    email: string;
    registrationNo: string;
  };
  owner: {
    name: string;
    estateName: string;
    address: string;
    payoutMethod: 'bank' | 'cash';
    bank: string;
    /** only the last 4 digits */
    accountMasked: string;
  };
}

export interface SettlementDetail {
  settlement: SettlementRow;
  /** a generated settlement's calculation — frozen once processed, live for a draft; null on seeded rows */
  calculation: SettlementCalculation | null;
  statement: StatementParties;
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
    private readonly generator: SettlementGeneratorService,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepo: Repository<SystemSettingEntity>,
  ) {}

  async list(q: SettlementQuery): Promise<SettlementListResult> {
    const facts = await this.estateFacts();
    const all = await this.allRows(facts);
    const periodRows = rowsInPeriod(all, q.month);
    const months = settledMonths(all);
    // the generator says what the month still needs (Settlement-Addendum)
    const run =
      q.month === ALL_PERIODS ? null : await this.generator.run(q.month);

    const filtered = sortRows(applyFilters(periodRows, q), q.sort, q.dir);
    const routes = (await this.routeRepo.find())
      .map((r) => ({ id: r.id, name: r.name ?? '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      ...paginate(filtered, q.page, q.limit),
      summary: summarize(
        periodRows,
        q.month,
        run
          ? {
              eligible: run.candidates + run.processed,
              notPrepared: run.notPrepared,
              willPrepare: run.candidates,
            }
          : null,
        months[0] ?? null,
      ),
      months,
      routes,
    };
  }

  /** Estates with deliveries in `month` and no settlement yet: not prepared, or waiting. */
  async unsettled(month: string): Promise<UnsettledOwner[]> {
    const run = await this.generator.run(month);
    const facts = await this.estateFacts();
    const fact = (estateId: string) =>
      facts.get(Number(estateId.replace(/^EST-/, '')));
    const notPrepared: UnsettledOwner[] = run.rows
      .filter((r) => !r.settlementId)
      .map((r) => ({
        estateId: r.estateId,
        estateName: r.estateName,
        ownerName: r.ownerName,
        route: r.route,
        paymentMethod: r.payoutMethod,
        deliveries: r.calc.leaf.length,
        gradedKg: Math.round((r.calc.superKg + r.calc.normalKg) * 100) / 100,
        state: 'not_prepared',
        reason: 'Not prepared yet — Prepare settlements makes its draft.',
      }));
    const waiting: UnsettledOwner[] = run.waiting.map((w) => ({
      estateId: w.estateId,
      estateName: w.estateName,
      ownerName: fact(w.estateId)?.ownerName ?? 'Unknown',
      route: fact(w.estateId)?.route ?? '',
      paymentMethod: fact(w.estateId)?.paymentMethod ?? 'bank',
      deliveries: 0,
      gradedKg: 0,
      state: 'waiting',
      reason: [
        w.ungraded ? `${w.ungraded} not graded yet` : '',
        w.open ? `${w.open} inside the grading window` : '',
        w.excluded ? `${w.excluded} excluded (rolls to next month)` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    }));
    return [...notPrepared, ...waiting];
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
        settlement.status === 'Pending'
          ? c.settlementId === null &&
            (c.paymentMethod ?? 'deduct') === 'deduct'
          : c.settlementId === settlement.id,
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
        settlement.status === 'Legacy'
          ? false
          : settlement.status === 'Processed'
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

    return {
      settlement,
      deliveries,
      fertilizerCharges: charges,
      advances,
      calculation: await this.calculationOf(id, settlement),
      statement: await this.parties(estateId),
    };
  }

  /** Processed: the frozen calculation. Draft: as of now (it recalculates until processed). */
  private async calculationOf(
    id: string,
    settlement: SettlementRow,
  ): Promise<SettlementCalculation | null> {
    if (!settlement.generated) return null;
    if (settlement.status === 'Pending') {
      const run = await this.generator.run(settlement.month);
      const live = run.rows.find((r) => r.settlementId === id);
      if (live) return live.calc;
    }
    const row = await this.settlementRepo.findOne({ where: { id } });
    return (row?.calculation as SettlementCalculation) ?? null;
  }

  private async parties(estateId: number): Promise<StatementParties> {
    const [estate, profileRow] = await Promise.all([
      this.estateRepo.findOne({ where: { id: estateId } }),
      this.settingRepo.findOne({ where: { key: 'factoryProfile' } }),
    ]);
    const owner = estate
      ? await this.ownerRepo.findOne({ where: { id: estate.ownerId } })
      : null;
    const p = (profileRow?.value ?? {}) as Partial<
      Record<
        'name' | 'address' | 'contact' | 'email' | 'registrationNo',
        string
      >
    >;
    const account = estate?.bankAccount?.trim() ?? '';
    return {
      factory: {
        name: p.name ?? '',
        address: p.address ?? '',
        contact: p.contact ?? '',
        email: p.email ?? '',
        registrationNo: p.registrationNo ?? '',
      },
      owner: {
        name: owner?.name ?? 'Unknown',
        estateName: estate?.name ?? '',
        address: estate?.address ?? estate?.location ?? '',
        payoutMethod: estate?.paymentMethod ?? 'bank',
        bank: [estate?.bankName, estate?.bankBranch].filter(Boolean).join(', '),
        accountMasked: account ? `•••• ${account.slice(-4)}` : '',
      },
    };
  }

  private async allRows(
    facts: Map<number, EstateFacts>,
  ): Promise<SettlementRow[]> {
    const settlements = await this.estates.listSettlements();
    return settlements.map((s) =>
      toSettlementRow(s, facts.get(Number(s.estateId.replace(/^EST-/, '')))),
    );
  }

  /** Owner / route / method per estate — also used by EstateAdvanceViewService. */
  async estateFacts(): Promise<Map<number, EstateFacts>> {
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
