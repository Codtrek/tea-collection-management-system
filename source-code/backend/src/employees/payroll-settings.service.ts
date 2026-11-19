import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';

export interface PayrollSettings {
  /**
   * The most a month's advance deductions may take, as a % of that month's gross. 50 is a
   * placeholder default — NOT a confirmed legal limit; HR / legal must confirm the figure.
   */
  advanceDeductionCapPct: number;
  /** the longest an advance repayment plan may run, in months */
  maxInstallmentMonths: number;
  /** Administration-Addendum §7: hours in a standard working day (day rate × this = a day's pay) */
  standardHoursPerDay: number;
  /**
   * The statutory minimum DAILY pay per category (Wages Board / Shop & Office Act). null = not
   * entered yet: pay changes are then not checked against a minimum, and say so. Never guessed.
   */
  minimumDailyPay: { factory: number | null; office: number | null };
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  advanceDeductionCapPct: 50,
  maxInstallmentMonths: 6,
  standardHoursPerDay: 8,
  minimumDailyPay: { factory: null, office: null },
};

/** Reads `system_settings.payroll`, falling back per field — same pattern as FertilizerSettingsService. */
@Injectable()
export class PayrollSettingsService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly repo: Repository<SystemSettingEntity>,
  ) {}

  async get(): Promise<PayrollSettings> {
    const row = await this.repo.findOne({ where: { key: 'payroll' } });
    const v = (row?.value ?? {}) as Partial<
      Record<keyof PayrollSettings, unknown>
    >;
    const d = DEFAULT_PAYROLL_SETTINGS;
    const num = (x: unknown, ok: (n: number) => boolean, fallback: number) =>
      typeof x === 'number' && Number.isFinite(x) && ok(x) ? x : fallback;
    return {
      advanceDeductionCapPct: num(
        v.advanceDeductionCapPct,
        (n) => n > 0 && n <= 100,
        d.advanceDeductionCapPct,
      ),
      maxInstallmentMonths: num(
        v.maxInstallmentMonths,
        (n) => Number.isInteger(n) && n >= 1 && n <= 60,
        d.maxInstallmentMonths,
      ),
      standardHoursPerDay: num(
        v.standardHoursPerDay,
        (n) => n > 0 && n <= 24,
        d.standardHoursPerDay,
      ),
      minimumDailyPay: {
        factory: minimum(v.minimumDailyPay, 'factory'),
        office: minimum(v.minimumDailyPay, 'office'),
      },
    };
  }
}

/** A positive minimum, or null when it hasn't been entered. */
function minimum(m: unknown, key: 'factory' | 'office'): number | null {
  const x = (m as Record<string, unknown> | undefined)?.[key];
  return typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : null;
}
