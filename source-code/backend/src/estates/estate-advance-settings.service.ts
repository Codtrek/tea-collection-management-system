import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';

/** What a settlement deducts, in this order, until its money runs out (§4). */
export type SettlementDeductionStep = 'transport' | 'fertilizer' | 'advances';

export interface EstateAdvanceSettings {
  /**
   * The most a settlement's advance installments may take, as a % of its gross. 50 is a
   * placeholder default — NOT a confirmed rule; the factory must confirm the figure.
   */
  deductionCapPct: number;
  /** the longest a repayment plan may run, in settlement periods */
  maxInstallmentMonths: number;
  /** warn (never block) when an installment is above this % of the 3-period average net */
  netWarnPct: number;
  deductionOrder: SettlementDeductionStep[];
}

export const DEFAULT_ESTATE_ADVANCE_SETTINGS: EstateAdvanceSettings = {
  deductionCapPct: 50,
  maxInstallmentMonths: 6,
  netWarnPct: 50,
  // agreed 2026-11-01: transport first, then fertilizer the owner chose to deduct, then advances
  deductionOrder: ['transport', 'fertilizer', 'advances'],
};

const STEPS: SettlementDeductionStep[] = [
  'transport',
  'fertilizer',
  'advances',
];

/** Reads `system_settings.estateAdvances`, falling back per field — the PayrollSettingsService pattern. */
@Injectable()
export class EstateAdvanceSettingsService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly repo: Repository<SystemSettingEntity>,
  ) {}

  async get(): Promise<EstateAdvanceSettings> {
    const row = await this.repo.findOne({ where: { key: 'estateAdvances' } });
    return readEstateAdvanceSettings(row?.value);
  }
}

export function readEstateAdvanceSettings(
  value: unknown,
): EstateAdvanceSettings {
  const v = (value ?? {}) as Partial<
    Record<keyof EstateAdvanceSettings, unknown>
  >;
  const d = DEFAULT_ESTATE_ADVANCE_SETTINGS;
  const num = (x: unknown, ok: (n: number) => boolean, fallback: number) =>
    typeof x === 'number' && Number.isFinite(x) && ok(x) ? x : fallback;
  const order = v.deductionOrder;
  const validOrder =
    Array.isArray(order) &&
    order.length === STEPS.length &&
    STEPS.every((s) => order.includes(s));
  return {
    deductionCapPct: num(
      v.deductionCapPct,
      (n) => n > 0 && n <= 100,
      d.deductionCapPct,
    ),
    maxInstallmentMonths: num(
      v.maxInstallmentMonths,
      (n) => Number.isInteger(n) && n >= 1 && n <= 60,
      d.maxInstallmentMonths,
    ),
    netWarnPct: num(v.netWarnPct, (n) => n > 0 && n <= 100, d.netWarnPct),
    deductionOrder: validOrder
      ? (order as SettlementDeductionStep[])
      : d.deductionOrder,
  };
}
