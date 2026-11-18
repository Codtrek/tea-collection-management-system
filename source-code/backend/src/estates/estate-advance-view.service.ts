import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ScheduleStatus } from '../advances/installments';
import { labelToKey } from '../reports/reports-map';
import { remainingOf, scheduleFor } from './estate-advance-balance';
import {
  EstateAdvancePlanService,
  type PublicEstateReschedule,
} from './estate-advance-plan.service';
import { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import { EstateAdvanceSettingsService } from './estate-advance-settings.service';
import { EstateAdvanceEntity } from './estate-advance.entity';
import {
  buildAdvanceList,
  type EstateAdvanceListResult,
  type EstateAdvanceQuery,
  type EstateAdvanceRow,
  toAdvanceRow,
} from './estate-advance-view';
import { parseEstateId, settlementNet } from './estate-map';
import { EstatesService } from './estates.service';
import { SettlementEntity } from './settlement.entity';
import { SettlementViewService } from './settlement-view.service';

export interface EstateAdvanceScheduleRow {
  period: string;
  planned: number;
  deducted: number;
  /** planned − deducted: pushed to later periods */
  carried: number;
  status: ScheduleStatus;
  /** the settlement for that period, when one exists */
  settlementId: string | null;
  settlementStatus: 'Pending' | 'Processed' | null;
}

export interface EstateAdvanceDetail {
  advance: EstateAdvanceRow;
  schedule: EstateAdvanceScheduleRow[];
  repayments: {
    kind: 'cash' | 'bank';
    amount: number;
    paidOn: string | null;
    reference: string | null;
    recordedBy: string | null;
  }[];
  reschedules: PublicEstateReschedule[];
}

/** What the Issue form shows once an estate is picked (Estate-Owner-Advances-Addendum §4–5). */
export interface EstateAdvanceContext {
  estateId: string;
  estateName: string;
  active: boolean;
  /** Σ remaining over its open advances — the shared selector */
  outstandingAdvanceRs: number;
  openAdvances: { id: string; remaining: number; nextPeriod: string | null }[];
  /** average net over the last 3 processed settlements (null: none processed yet) */
  averageNetRs: number | null;
  averagePeriods: string[];
  deductionCapPct: number;
  netWarnPct: number;
  maxInstallmentMonths: number;
}

/**
 * EST-05 list + detail (Estate-Owner-Advances-Addendum §3–4). Read-only: balances and schedules
 * come from estate-advance-balance.ts (the shared installment model).
 */
@Injectable()
export class EstateAdvanceViewService {
  constructor(
    private readonly estates: EstatesService,
    private readonly settlementView: SettlementViewService,
    private readonly plans: EstateAdvancePlanService,
    private readonly settings: EstateAdvanceSettingsService,
    @InjectRepository(EstateAdvanceEntity)
    private readonly advanceRepo: Repository<EstateAdvanceEntity>,
    @InjectRepository(EstateAdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<EstateAdvanceRecoveryEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
  ) {}

  async list(q: EstateAdvanceQuery): Promise<EstateAdvanceListResult> {
    const [advances, recoveries, facts] = await Promise.all([
      this.advanceRepo.find(),
      this.recoveryRepo.find(),
      this.settlementView.estateFacts(),
    ]);
    const rows = advances.map((a) =>
      toAdvanceRow(
        this.estates.toPublicAdvance(a),
        a,
        facts.get(a.estateId),
        recoveries,
      ),
    );
    return buildAdvanceList(rows, recoveries, q);
  }

  async detail(id: string): Promise<EstateAdvanceDetail> {
    const advance = await this.advanceRepo.findOne({ where: { id } });
    if (!advance) throw new NotFoundException(`No estate advance "${id}".`);
    const [facts, recoveries, settlements, reschedules] = await Promise.all([
      this.settlementView.estateFacts(),
      this.recoveryRepo.find({ where: { advanceId: id } }),
      this.settlementRepo.find({ where: { estateId: advance.estateId } }),
      this.plans.reschedules(id),
    ]);
    const own = recoveries.filter((r) => r.advanceId === id);
    const forPeriod = (period: string) =>
      settlements.find(
        (s) => s.estateId === advance.estateId && s.period === period,
      );
    return {
      advance: toAdvanceRow(
        this.estates.toPublicAdvance(advance),
        advance,
        facts.get(advance.estateId),
        own,
      ),
      schedule: scheduleFor(advance, own).months.map((m) => {
        const rec = own.find((r) => r.period === m.period);
        const s = rec?.settlementId
          ? settlements.find((x) => x.id === rec.settlementId)
          : forPeriod(m.period);
        return {
          ...m,
          settlementId: s?.id ?? rec?.settlementId ?? null,
          settlementStatus: s
            ? s.status === 'processed'
              ? 'Processed'
              : 'Pending'
            : null,
        };
      }),
      repayments: own
        .filter((r) => r.kind !== 'settlement')
        .sort((a, b) => a.recoveredAt.getTime() - b.recoveredAt.getTime())
        .map((r) => ({
          kind: r.kind as 'cash' | 'bank',
          amount: Number(r.amount),
          paidOn: r.paidOn,
          reference: r.reference,
          recordedBy: r.recordedBy,
        })),
      reschedules,
    };
  }

  async context(estateId: string): Promise<EstateAdvanceContext> {
    const estate = await this.estates.findById(estateId); // 404s an unknown id
    const id = parseEstateId(estate.id);
    const [advances, recoveries, settlements, settings] = await Promise.all([
      this.advanceRepo.find({ where: { estateId: id } }),
      this.recoveryRepo.find(),
      this.settlementRepo.find({ where: { estateId: id } }),
      this.settings.get(),
    ]);
    const open = advances
      .filter((a) => a.estateId === id)
      .map((a) => {
        const own = recoveries.filter((r) => r.advanceId === a.id);
        return {
          id: a.id,
          remaining: remainingOf(a, own),
          nextPeriod: scheduleFor(a, own).nextPeriod,
        };
      })
      .filter((a) => a.remaining > 0);
    const last3 = settlements
      .filter((s) => s.estateId === id && s.status === 'processed')
      .sort((a, b) => labelToKey(b.period).localeCompare(labelToKey(a.period)))
      .slice(0, 3);
    return {
      estateId: estate.id,
      estateName: estate.estateName,
      active: estate.status === 'Active',
      outstandingAdvanceRs:
        Math.round(open.reduce((s, a) => s + a.remaining, 0) * 100) / 100,
      openAdvances: open,
      averageNetRs: last3.length
        ? Math.round(
            last3.reduce((s, x) => s + settlementNet(x), 0) / last3.length,
          )
        : null,
      averagePeriods: last3.map((s) => s.period),
      deductionCapPct: settings.deductionCapPct,
      netWarnPct: settings.netWarnPct,
      maxInstallmentMonths: settings.maxInstallmentMonths,
    };
  }
}
