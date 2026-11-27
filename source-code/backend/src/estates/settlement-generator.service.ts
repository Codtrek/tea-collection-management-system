import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';
import { GradeRateEntity } from '../admin/grade-rate.entity';
import type { TransportStatus } from '../admin/transport-rules';
import { round2 } from '../advances/installments';
import { AuditService } from '../audit/audit.service';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { SettlementAdjustmentEntity } from '../collections/settlement-adjustment.entity';
import { localDate } from '../dispatch/dispatch-map';
import { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import { FertilizerChargeEntity } from '../fertilizer/fertilizer-charge.entity';
import { formatChargeId } from '../fertilizer/fertilizer-map';
import { FertilizerRequestEntity } from '../fertilizer/fertilizer-request.entity';
import { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import { keyToLabel, labelToKey } from '../reports/reports-map';
import { dbStatusFor } from './estate-advance-balance';
import { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import { EstateAdvanceSettingsService } from './estate-advance-settings.service';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { formatEstateId, type OwnerPaymentMethod } from './estate-map';
import { EstateOwnerEntity } from './estate-owner.entity';
import { EstateEntity } from './estate.entity';
import type { Actor } from './estates.service';
import { SettlementDeliveryExclusionEntity } from './settlement-delivery-exclusion.entity';
import {
  generateSettlement,
  monthRatePeriods,
  runTotals,
  sameCalculation,
  type GenRateVersion,
  type RunTotals,
  type SettlementCalculation,
} from './settlement-generator';
import { SettlementEntity } from './settlement.entity';
import { TransportStatusService } from './transport-status.service';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** One estate on the Process page: its draft (or what a draft would be) and whether it can go. */
export interface RunRow {
  /** null = no draft prepared yet */
  settlementId: string | null;
  status: 'Draft' | 'Not prepared';
  estateId: string;
  estateName: string;
  ownerName: string;
  route: string;
  payoutMethod: OwnerPaymentMethod;
  /** the calculation as of now (a draft recalculates until processed) */
  calc: SettlementCalculation;
  /** the stored draft no longer matches the calculation (rates, charges or deliveries changed) */
  changedSincePrepared: boolean;
  /** would be processed by the run */
  ready: boolean;
  /** why not: blockers, then the exclusion reason */
  reasons: string[];
}

export interface SettlementRun {
  month: string;
  period: string;
  ratePeriods: {
    rateId: string;
    from: string;
    to: string;
    superRate: number;
    normalRate: number;
  }[];
  transport: TransportStatus;
  /** estates with payable deliveries this month (each gets a draft) */
  candidates: number;
  prepared: number;
  processed: number;
  notPrepared: number;
  rows: RunRow[];
  /** estates with deliveries this month but nothing payable yet (all ungraded / OPEN / excluded) */
  waiting: {
    estateId: string;
    estateName: string;
    ungraded: number;
    open: number;
    excluded: number;
  }[];
  legacy: { id: string; estateName: string; status: string; reason: string }[];
  /** the rows a Process run would take — the page's totals row AND the confirm popup */
  totals: RunTotals;
}

interface Facts {
  month: string;
  now: Date;
  estates: EstateEntity[];
  owners: Map<number, string>;
  settlements: SettlementEntity[];
  deliveries: CollectionRecordEntity[];
  exclusions: SettlementDeliveryExclusionEntity[];
  rates: GenRateVersion[];
  firstRealMonth: string;
  adjustments: SettlementAdjustmentEntity[];
  charges: FertilizerChargeEntity[];
  itemOf: (c: FertilizerChargeEntity) => string;
  advances: EstateAdvanceEntity[];
  recoveries: EstateAdvanceRecoveryEntity[];
  capPct: number;
  order: Awaited<
    ReturnType<EstateAdvanceSettingsService['get']>
  >['deductionOrder'];
  transportVersions: Awaited<ReturnType<TransportStatusService['versions']>>;
}

/**
 * The settlement generator (Settlement-Addendum): prepares one draft per estate with payable
 * deliveries for a month, recalculates drafts until they are processed, and processes them —
 * freezing the calculation, linking the deliveries, recovering the fertilizer charges and the
 * advance installments it took. The calculation itself is `generateSettlement` (pure).
 */
@Injectable()
export class SettlementGeneratorService {
  constructor(
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
    @InjectRepository(EstateEntity)
    private readonly estateRepo: Repository<EstateEntity>,
    @InjectRepository(EstateOwnerEntity)
    private readonly ownerRepo: Repository<EstateOwnerEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly deliveryRepo: Repository<CollectionRecordEntity>,
    @InjectRepository(SettlementDeliveryExclusionEntity)
    private readonly exclusionRepo: Repository<SettlementDeliveryExclusionEntity>,
    @InjectRepository(SettlementAdjustmentEntity)
    private readonly adjustmentRepo: Repository<SettlementAdjustmentEntity>,
    @InjectRepository(FertilizerChargeEntity)
    private readonly chargeRepo: Repository<FertilizerChargeEntity>,
    @InjectRepository(FertilizerRequestEntity)
    private readonly requestRepo: Repository<FertilizerRequestEntity>,
    @InjectRepository(StockMovementEntity)
    private readonly movementRepo: Repository<StockMovementEntity>,
    @InjectRepository(FertilizerBatchEntity)
    private readonly batchRepo: Repository<FertilizerBatchEntity>,
    @InjectRepository(EstateAdvanceEntity)
    private readonly advanceRepo: Repository<EstateAdvanceEntity>,
    @InjectRepository(EstateAdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<EstateAdvanceRecoveryEntity>,
    @InjectRepository(GradeRateEntity)
    private readonly rateRepo: Repository<GradeRateEntity>,
    private readonly transport: TransportStatusService,
    private readonly advanceSettings: EstateAdvanceSettingsService,
    private readonly audit: AuditService,
  ) {}

  // ── read ───────────────────────────────────────────────────────────────────────────────────

  async run(month: string, now = new Date()): Promise<SettlementRun> {
    const f = await this.facts(this.checkMonth(month), now);
    return this.buildRun(f);
  }

  // ── prepare ────────────────────────────────────────────────────────────────────────────────

  /** Creates or recalculates the month's drafts; drafts for estates with nothing payable go. */
  async prepare(
    actor: Actor,
    month: string,
    now = new Date(),
  ): Promise<SettlementRun> {
    this.checkMonth(month);
    const summary = await this.settlementRepo.manager.transaction(
      async (em) => {
        const f = await this.facts(month, now, em);
        const run = this.buildRun(f);
        const repo = em.getRepository(SettlementEntity);
        let created = 0;
        let updated = 0;
        const keep = new Set<string>();
        for (const row of run.rows) {
          const existing = row.settlementId
            ? f.settlements.find((s) => s.id === row.settlementId)!
            : null;
          const entity =
            existing ??
            repo.create({
              id: this.nextId(f.settlements, month),
              status: 'pending',
              processedBy: null,
              processedOn: null,
              legacyReason: null,
            });
          this.writeDraft(entity, row.calc, actor, now);
          const saved = await repo.save(entity);
          if (!existing) f.settlements.push(saved);
          keep.add(saved.id);
          if (existing) updated += 1;
          else created += 1;
        }
        const stale = f.settlements.filter(
          (s) =>
            s.status === 'pending' &&
            s.calculation != null &&
            labelToKey(s.period) === month &&
            !keep.has(s.id),
        );
        for (const s of stale) await repo.remove(s);
        return { created, updated, removed: stale.length };
      },
    );
    await this.audit.record(actor, {
      action: 'Prepared settlements',
      module: 'Estate Owner',
      record: keyToLabel(month),
      recordHref: `/estates/settlements?month=${month}`,
      details: `${summary.created} new draft(s), ${summary.updated} recalculated${summary.removed ? `, ${summary.removed} removed (nothing payable any more)` : ''}`,
    });
    return this.run(month, now);
  }

  // ── exclude ────────────────────────────────────────────────────────────────────────────────

  /**
   * A Manager leaves a delivery out of a month, with a reason — it stops blocking the estate and
   * rolls into the next month the estate is settled for.
   */
  async exclude(
    actor: Actor,
    deliveryId: string,
    month: string,
    reason: string,
  ): Promise<SettlementRun> {
    this.checkMonth(month);
    const why = reason?.trim() ?? '';
    if (why.length < 5) {
      throw new BadRequestException(
        'Give a reason (at least 5 characters) for excluding the delivery.',
      );
    }
    const delivery = await this.deliveryRepo.findOne({
      where: { id: deliveryId },
    });
    if (!delivery) throw new NotFoundException(`No delivery "${deliveryId}".`);
    if (delivery.settlementId) {
      throw new ConflictException(
        `${deliveryId} is already paid by ${delivery.settlementId}.`,
      );
    }
    if (String(delivery.collectionDate).slice(0, 7) > month) {
      throw new BadRequestException(
        `${deliveryId} is dated after ${keyToLabel(month)}.`,
      );
    }
    const existing = await this.exclusionRepo.findOne({
      where: { deliveryId },
    });
    const row =
      existing ?? this.exclusionRepo.create({ deliveryId, auto: false });
    row.month = month;
    row.reason = why;
    row.auto = false;
    row.excludedBy = actor.name;
    row.excludedAt = new Date();
    await this.exclusionRepo.save(row);
    await this.audit.record(actor, {
      action: 'Excluded delivery from settlement',
      module: 'Estate Owner',
      record: deliveryId,
      recordHref: `/collections/${deliveryId}`,
      details: `${keyToLabel(month)} — ${why}. Rolls to the next month.`,
    });
    return this.run(month);
  }

  // ── process ────────────────────────────────────────────────────────────────────────────────

  /**
   * Processes every ready draft of the month in one transaction. `expectedNet` is the total the
   * officer reviewed and re-typed: if the figures moved since, nothing is processed.
   */
  async process(
    actor: Actor,
    month: string,
    expectedNet?: number,
    now = new Date(),
  ): Promise<{ processed: string[]; totals: RunTotals }> {
    this.checkMonth(month);
    const result = await this.settlementRepo.manager.transaction(async (em) => {
      const f = await this.facts(month, now, em);
      const run = this.buildRun(f);
      const ready = run.rows.filter((r) => r.ready && r.settlementId);
      if (ready.length === 0) {
        throw new ConflictException(
          run.rows.some((r) => r.settlementId)
            ? `No settlement for ${keyToLabel(month)} is ready to process. ${run.rows
                .filter((r) => r.reasons.length)
                .slice(0, 3)
                .map((r) => `${r.estateName}: ${r.reasons[0]}`)
                .join(' ')}`
            : `No settlements are prepared for ${keyToLabel(month)}. Prepare them first.`,
        );
      }
      if (
        expectedNet !== undefined &&
        round2(expectedNet) !== round2(run.totals.net)
      ) {
        throw new ConflictException(
          `The figures changed since you reviewed them (net payable is now Rs. ${run.totals.net.toLocaleString('en-US')}). Review the settlements again.`,
        );
      }
      const ids: string[] = [];
      for (const row of ready) {
        await this.processOne(em, f, row, actor, now);
        ids.push(row.settlementId!);
      }
      return { processed: ids, totals: run.totals };
    });
    const linked = result.processed.length;
    await this.audit.record(actor, {
      action: 'Processed settlement run',
      module: 'Estate Owner',
      record: `${linked} settlement(s) · ${keyToLabel(month)}`,
      recordHref: `/estates/settlements?month=${month}`,
      details: `Gross Rs. ${result.totals.gross.toLocaleString('en-US')}, deductions Rs. ${result.totals.deductions.toLocaleString('en-US')}, net payable Rs. ${result.totals.net.toLocaleString('en-US')}; carried forward Rs. ${result.totals.carriedForward.toLocaleString('en-US')}`,
    });
    return result;
  }

  private async processOne(
    em: EntityManager,
    f: Facts,
    row: RunRow,
    actor: Actor,
    now: Date,
  ): Promise<void> {
    const c = row.calc;
    const settlements = em.getRepository(SettlementEntity);
    const settlement = f.settlements.find((s) => s.id === row.settlementId)!;
    this.writeDraft(settlement, c, actor, now, true);
    settlement.status = 'processed';
    settlement.processedBy = actor.name;
    settlement.processedOn = now;
    await settlements.save(settlement);

    // the deliveries it pays for
    const deliveries = em.getRepository(CollectionRecordEntity);
    const paid = new Set(c.leaf.map((l) => l.deliveryId));
    for (const d of f.deliveries.filter((x) => paid.has(x.id))) {
      d.settlementId = settlement.id;
      await deliveries.save(d);
    }
    // what it left behind in the month rolls on: OPEN ones, and ones not collected yet
    const exclusions = em.getRepository(SettlementDeliveryExclusionEntity);
    const handled = new Set([...paid, ...c.excluded.map((x) => x.id)]);
    const left = f.deliveries.filter(
      (d) =>
        d.estateId === c.estateId &&
        !d.settlementId &&
        !handled.has(d.id) &&
        (String(d.collectionDate).slice(0, 7) === f.month ||
          c.open.some((o) => o.id === d.id)),
    );
    for (const d of left) {
      const open = c.open.some((o) => o.id === d.id);
      const existing = f.exclusions.find((x) => x.deliveryId === d.id);
      const ex =
        existing ?? exclusions.create({ deliveryId: d.id, auto: true });
      ex.month = f.month;
      ex.auto = true;
      ex.reason = open
        ? 'Inside the grading correction window when the month was processed'
        : `Not delivered to the factory when ${keyToLabel(f.month)} was processed`;
      ex.excludedBy = actor.name;
      ex.excludedAt = now;
      await exclusions.save(ex);
    }

    // approved corrections carried into it
    const adjustments = em.getRepository(SettlementAdjustmentEntity);
    for (const line of c.adjustments.lines) {
      const a = f.adjustments.find((x) => x.id === line.id)!;
      a.status = 'applied';
      a.appliedSettlementId = settlement.id;
      await adjustments.save(a);
    }

    // fertilizer charges it recovered — each one once, whole
    const charges = em.getRepository(FertilizerChargeEntity);
    for (const line of c.fertilizer.lines.filter((l) => l.taken > 0)) {
      const charge = f.charges.find((x) => x.id === line.chargeId)!;
      charge.settlementId = settlement.id;
      await charges.save(charge);
    }

    // advance installments: planned vs taken (the rest is carried forward)
    const recoveries = em.getRepository(EstateAdvanceRecoveryEntity);
    const advances = em.getRepository(EstateAdvanceEntity);
    for (const line of c.advances.lines) {
      f.recoveries.push(
        await recoveries.save(
          recoveries.create({
            advanceId: line.advanceId,
            settlementId: settlement.id,
            kind: 'settlement',
            period: c.period,
            plannedAmount: String(line.planned),
            amount: String(line.taken),
            status: 'recovered',
            reference: null,
            paidOn: null,
            recordedBy: actor.name,
            recoveredAt: now,
          }),
        ),
      );
      const advance = f.advances.find((a) => a.id === line.advanceId)!;
      const status = dbStatusFor(advance, f.recoveries);
      if (status !== advance.status) {
        advance.status = status;
        await advances.save(advance);
      }
    }
  }

  // ── helpers ────────────────────────────────────────────────────────────────────────────────

  private writeDraft(
    s: SettlementEntity,
    c: SettlementCalculation,
    actor: Actor,
    now: Date,
    freezing = false,
  ): void {
    const last = c.ratePeriods.at(-1);
    s.estateId = c.estateId;
    s.estateName = c.estateName;
    s.period = c.period;
    s.superKg = String(c.superKg);
    s.normalKg = String(c.normalKg);
    // display only — gross_amount is what was priced (one row can span several rate periods)
    s.superRate = String(last?.superRate ?? 0);
    s.normalRate = String(last?.normalRate ?? 0);
    s.grossAmount = String(c.gross);
    s.adjustmentAmount = String(c.adjustments.total);
    s.transportCost = String(c.transport.taken);
    s.transportStatus =
      c.transport.status === 'not_configured' ? null : c.transport.status;
    s.transportCharge = String(c.transport.charge);
    s.transportVersionId = c.transport.versionId;
    s.transportCarriedIn = String(c.transport.carriedIn);
    s.transportCarriedOut = String(c.transport.carriedOut);
    s.fertilizerDeduction = String(c.fertilizer.taken);
    s.advanceDeduction = String(c.advances.taken);
    s.selfDelivery = c.selfDelivery;
    s.payoutMethod = c.payoutMethod;
    s.excludedReason = c.excludedReason;
    s.missingBank = c.excludedReason !== null;
    s.calculation = freezing ? { ...c, frozenAt: now.toISOString() } : c;
    if (!freezing) {
      s.preparedBy = actor.name;
      s.preparedAt = now;
    }
  }

  /** 'SET-2026-07-005' — the next free number in the month. */
  private nextId(settlements: SettlementEntity[], month: string): string {
    const prefix = `SET-${month}-`;
    const max = settlements
      .filter((s) => s.id.startsWith(prefix))
      .map((s) => Number(s.id.slice(prefix.length)) || 0)
      .reduce((a, b) => Math.max(a, b), 0);
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  private buildRun(f: Facts): SettlementRun {
    const period = keyToLabel(f.month);
    const inMonth = f.settlements.filter((s) => s.period === period);
    const processedEstates = new Set(
      inMonth.filter((s) => s.status === 'processed').map((s) => s.estateId),
    );
    const draftOf = new Map(
      inMonth.filter((s) => s.status === 'pending').map((s) => [s.estateId, s]),
    );
    const rolled = new Set(
      f.exclusions.filter((e) => e.month < f.month).map((e) => e.deliveryId),
    );
    const byEstate = new Map<number, CollectionRecordEntity[]>();
    for (const d of f.deliveries) {
      if (d.estateId == null || d.settlementId) continue;
      const m = String(d.collectionDate).slice(0, 7);
      if (m !== f.month && !(m < f.month && rolled.has(d.id))) continue;
      byEstate.set(d.estateId, [...(byEstate.get(d.estateId) ?? []), d]);
    }

    const rows: RunRow[] = [];
    const waiting: SettlementRun['waiting'] = [];
    for (const estate of f.estates) {
      if (processedEstates.has(estate.id)) continue;
      const own = byEstate.get(estate.id) ?? [];
      const draft = draftOf.get(estate.id) ?? null;
      if (own.length === 0 && !draft) continue;
      const calc = this.calculate(f, estate, own);
      if (calc.leaf.length === 0) {
        if (calc.ungraded.length + calc.open.length + calc.excluded.length) {
          waiting.push({
            estateId: formatEstateId(estate.id),
            estateName: estate.name,
            ungraded: calc.ungraded.length,
            open: calc.open.length,
            excluded: calc.excluded.length,
          });
        }
        if (!draft) continue;
      }
      // an earlier month still pending for this estate goes first (balances recover in order)
      const earlier = f.settlements.find(
        (s) =>
          s.estateId === estate.id &&
          s.status === 'pending' &&
          s.calculation != null &&
          labelToKey(s.period) < f.month,
      );
      const reasons = [
        ...(calc.leaf.length === 0
          ? [
              'Nothing payable this month any more — prepare again to remove the draft.',
            ]
          : []),
        ...(earlier
          ? [
              `${earlier.period} (${earlier.id}) is still pending — process it first.`,
            ]
          : []),
        ...calc.blockers,
        ...(calc.excludedReason ? [calc.excludedReason] : []),
      ];
      rows.push({
        settlementId: draft?.id ?? null,
        status: draft ? 'Draft' : 'Not prepared',
        estateId: formatEstateId(estate.id),
        estateName: estate.name,
        ownerName: f.owners.get(estate.ownerId) ?? 'Unknown',
        route: estate.routeName ?? '',
        payoutMethod: calc.payoutMethod,
        calc,
        changedSincePrepared:
          !!draft?.calculation &&
          !sameCalculation(draft.calculation as SettlementCalculation, calc),
        ready: !!draft && reasons.length === 0,
        reasons,
      });
    }
    rows.sort((a, b) => a.estateName.localeCompare(b.estateName));

    return {
      month: f.month,
      period,
      ratePeriods: monthRatePeriods(f.rates, f.month).map((p) => ({
        rateId: p.rate.id,
        from: p.from,
        to: p.to,
        superRate: p.rate.superRate,
        normalRate: p.rate.normalRate,
      })),
      transport: this.transport.statusFrom(f.transportVersions, f.month),
      candidates: rows.filter((r) => r.calc.leaf.length > 0).length,
      prepared: rows.filter((r) => r.settlementId).length,
      processed: inMonth.filter((s) => s.status === 'processed').length,
      notPrepared: rows.filter((r) => !r.settlementId).length,
      rows,
      waiting,
      legacy: inMonth
        .filter((s) => s.status === 'legacy')
        .map((s) => ({
          id: s.id,
          estateName: s.estateName,
          status: 'Legacy',
          reason: s.legacyReason ?? 'Seeded snapshot — kept read-only.',
        })),
      totals: runTotals(rows.filter((r) => r.ready).map((r) => r.calc)),
    };
  }

  private calculate(
    f: Facts,
    estate: EstateEntity,
    deliveries: CollectionRecordEntity[],
  ): SettlementCalculation {
    const advances = f.advances.filter(
      (a) => a.estateId === estate.id && a.status !== 'deducted',
    );
    const advanceIds = new Set(advances.map((a) => a.id));
    // what the estate's last processed settlement before this month left owing for transport
    const last = f.settlements
      .filter(
        (s) =>
          s.estateId === estate.id &&
          s.status === 'processed' &&
          labelToKey(s.period) < f.month,
      )
      .sort((a, b) =>
        labelToKey(b.period).localeCompare(labelToKey(a.period)),
      )[0];
    return generateSettlement({
      month: f.month,
      estate: {
        id: estate.id,
        name: estate.name,
        selfDelivery: estate.selfDelivery,
        payoutMethod: estate.paymentMethod ?? 'bank',
        bankAccount: estate.bankAccount,
      },
      deliveries: deliveries.map((d) => ({
        id: d.id,
        date: String(d.collectionDate).slice(0, 10),
        status: d.status,
        lockedAt: d.lockedAt,
        settlementId: d.settlementId,
        lines: (d.gradeLines ?? []).map((l) => ({
          grade: l.grade,
          weightKg: Number(l.weightKg),
        })),
      })),
      exclusions: f.exclusions.map((e) => ({
        deliveryId: e.deliveryId,
        month: e.month,
        reason: e.reason,
      })),
      rates: f.rates,
      adjustments: f.adjustments
        .filter((a) => a.estateId === estate.id && a.status === 'pending')
        .map((a) => ({
          id: a.id,
          deliveryId: a.deliveryId,
          amount: Number(a.amountRs),
        })),
      transportVersions: f.transportVersions,
      transportCarriedIn: last ? Number(last.transportCarriedOut ?? 0) : 0,
      charges: f.charges
        .filter((c) => c.estateId === estate.id)
        .map((c) => ({
          id: c.id,
          ref: formatChargeId(c.id),
          date: localDate(c.calculatedAt),
          item: f.itemOf(c),
          quantityKg: Number(c.quantityKg),
          ratePerKg: Number(c.ratePerKg),
          amount: Number(c.totalCharge),
          method: c.paymentMethod,
          recovered: c.settlementId !== null,
        })),
      advances,
      recs: f.recoveries.filter((r) => advanceIds.has(r.advanceId)),
      capPct: f.capPct,
      order: f.order,
      firstRealMonth: f.firstRealMonth,
      now: f.now,
    });
  }

  private async facts(
    month: string,
    now: Date,
    em?: EntityManager,
  ): Promise<Facts> {
    const repo = <T extends object>(r: Repository<T>): Repository<T> =>
      em ? em.getRepository<T>(r.target) : r;
    const [
      estates,
      owners,
      settlements,
      deliveries,
      exclusions,
      rateRows,
      adjustments,
      charges,
      requests,
      movements,
      batches,
      advances,
      recoveries,
      settings,
      transportVersions,
    ] = await Promise.all([
      repo(this.estateRepo).find(),
      repo(this.ownerRepo).find(),
      repo(this.settlementRepo).find(),
      repo(this.deliveryRepo).find(),
      repo(this.exclusionRepo).find(),
      repo(this.rateRepo).find(),
      repo(this.adjustmentRepo).find(),
      repo(this.chargeRepo).find(),
      repo(this.requestRepo).find(),
      repo(this.movementRepo).find(),
      repo(this.batchRepo).find(),
      repo(this.advanceRepo).find(),
      repo(this.recoveryRepo).find(),
      this.advanceSettings.get(),
      this.transport.versions(),
    ]);
    const rates = rateRows
      .filter((r) => !r.cancelledAt)
      .map((r) => ({
        id: r.id,
        effectiveDate: String(r.effectiveDate).slice(0, 10),
        superRate: Number(r.superRate),
        normalRate: Number(r.normalRate),
      }));
    const requestById = new Map(requests.map((r) => [r.id, r]));
    const movementById = new Map(movements.map((m) => [m.id, m]));
    const batchById = new Map(batches.map((b) => [b.id, b]));
    return {
      month,
      now,
      estates,
      owners: new Map(owners.map((o) => [o.id, o.name])),
      settlements,
      deliveries,
      exclusions,
      rates,
      // the system's first real month: when the factory first priced leaf in it
      firstRealMonth:
        rates
          .map((r) => r.effectiveDate.slice(0, 7))
          .sort()
          .at(0) ?? month,
      adjustments,
      charges,
      itemOf: (c) => {
        const req =
          c.fertilizerRequestId != null
            ? requestById.get(c.fertilizerRequestId)
            : undefined;
        if (req?.item) return req.item;
        const mv =
          c.stockMovementId != null
            ? movementById.get(c.stockMovementId)
            : undefined;
        return (mv && batchById.get(mv.batchId)?.item) || 'Fertilizer';
      },
      advances,
      recoveries,
      capPct: settings.deductionCapPct,
      order: settings.deductionOrder,
      transportVersions,
    };
  }

  private checkMonth(month: string): string {
    if (!MONTH.test(month ?? '')) {
      throw new BadRequestException('month must be YYYY-MM.');
    }
    return month;
  }
}
