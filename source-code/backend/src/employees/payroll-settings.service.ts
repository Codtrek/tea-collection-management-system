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
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  advanceDeductionCapPct: 50,
  maxInstallmentMonths: 6,
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
    };
  }
}
