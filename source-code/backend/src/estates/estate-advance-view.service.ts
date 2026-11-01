import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import { EstateAdvanceEntity } from './estate-advance.entity';
import {
  buildAdvanceList,
  type EstateAdvanceListResult,
  type EstateAdvanceQuery,
  type EstateAdvanceRow,
  toAdvanceRow,
} from './estate-advance-view';
import { EstatesService } from './estates.service';
import { SettlementEntity } from './settlement.entity';
import { SettlementViewService } from './settlement-view.service';

export interface EstateAdvanceDetail {
  advance: EstateAdvanceRow;
  /** what each processed settlement took, oldest first */
  recoveries: {
    settlementId: string;
    period: string;
    amount: number;
    recoveredAt: string;
  }[];
  /** the estate's pending settlement that carries an advance deduction — planned, not recovered */
  planned: {
    settlementId: string;
    period: string;
    advanceDeduction: number;
  } | null;
}

/**
 * EST-05 list + detail (Estate-Owner-Advances-Addendum §3). Read-only: balances come from
 * estate-advance-balance.ts; nothing here changes an advance or a settlement.
 */
@Injectable()
export class EstateAdvanceViewService {
  constructor(
    private readonly estates: EstatesService,
    private readonly settlementView: SettlementViewService,
    @InjectRepository(EstateAdvanceEntity)
    private readonly advanceRepo: Repository<EstateAdvanceEntity>,
    @InjectRepository(EstateAdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<EstateAdvanceRecoveryEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
  ) {}

  async list(q: EstateAdvanceQuery): Promise<EstateAdvanceListResult> {
    const { rows, recoveries } = await this.allRows();
    return buildAdvanceList(rows, recoveries, q);
  }

  async detail(id: string): Promise<EstateAdvanceDetail> {
    const advance = await this.advanceRepo.findOne({ where: { id } });
    if (!advance) throw new NotFoundException(`No estate advance "${id}".`);
    const [facts, recoveries, settlements] = await Promise.all([
      this.settlementView.estateFacts(),
      this.recoveryRepo.find({ where: { advanceId: id } }),
      this.settlementRepo.find({ where: { estateId: advance.estateId } }),
    ]);
    const own = recoveries.filter((r) => r.advanceId === id);
    const row = toAdvanceRow(
      this.estates.toPublicAdvance(advance),
      advance,
      facts.get(advance.estateId),
      own,
    );
    const period = (sid: string) =>
      settlements.find((s) => s.id === sid)?.period ?? '';
    const pending = settlements
      .filter(
        (s) =>
          s.estateId === advance.estateId &&
          s.status === 'pending' &&
          Number(s.advanceDeduction) > 0,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    return {
      advance: row,
      recoveries: [...own]
        .sort((a, b) => a.recoveredAt.getTime() - b.recoveredAt.getTime())
        .map((r) => ({
          settlementId: r.settlementId,
          period: period(r.settlementId),
          amount: Number(r.amount),
          recoveredAt: r.recoveredAt.toISOString(),
        })),
      planned:
        pending && row.remaining > 0
          ? {
              settlementId: pending.id,
              period: pending.period,
              advanceDeduction: Number(pending.advanceDeduction),
            }
          : null,
    };
  }

  private async allRows(): Promise<{
    rows: EstateAdvanceRow[];
    recoveries: EstateAdvanceRecoveryEntity[];
  }> {
    const [advances, recoveries, facts] = await Promise.all([
      this.advanceRepo.find(),
      this.recoveryRepo.find(),
      this.settlementView.estateFacts(),
    ]);
    return {
      rows: advances.map((a) =>
        toAdvanceRow(
          this.estates.toPublicAdvance(a),
          a,
          facts.get(a.estateId),
          recoveries,
        ),
      ),
      recoveries,
    };
  }
}
