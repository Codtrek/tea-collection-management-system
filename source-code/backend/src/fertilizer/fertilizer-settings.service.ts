import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';

export interface FertilizerSettings {
  /** an approval above this many kg also needs a Factory Manager */
  managerApprovalAboveKg: number;
  /** failed attempts before a request goes to Needs review */
  maxDeliveryAttempts: number;
}

export const DEFAULT_FERTILIZER_SETTINGS: FertilizerSettings = {
  managerApprovalAboveKg: 500,
  maxDeliveryAttempts: 3,
};

/** Reads `system_settings.fertilizer`, falling back per field — same pattern as CollectionSettingsService. */
@Injectable()
export class FertilizerSettingsService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly repo: Repository<SystemSettingEntity>,
  ) {}

  async get(): Promise<FertilizerSettings> {
    const row = await this.repo.findOne({ where: { key: 'fertilizer' } });
    const v = (row?.value ?? {}) as Partial<
      Record<keyof FertilizerSettings, unknown>
    >;
    const d = DEFAULT_FERTILIZER_SETTINGS;
    const num = (x: unknown, ok: (n: number) => boolean, fallback: number) =>
      typeof x === 'number' && Number.isFinite(x) && ok(x) ? x : fallback;
    return {
      managerApprovalAboveKg: num(
        v.managerApprovalAboveKg,
        (n) => n > 0,
        d.managerApprovalAboveKg,
      ),
      maxDeliveryAttempts: num(
        v.maxDeliveryAttempts,
        (n) => Number.isInteger(n) && n >= 1,
        d.maxDeliveryAttempts,
      ),
    };
  }
}
