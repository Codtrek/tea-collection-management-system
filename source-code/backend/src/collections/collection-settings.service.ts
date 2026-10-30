import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';

export interface CollectionSettings {
  /** minutes after grading during which the grading officer may still edit directly */
  correctionWindowMin: number;
  /** % the factory total may differ from the estate weight before a warning / complaint */
  mismatchTolerancePct: number;
  /** a graded total below (median × low) or above (median × high) of the estate's usual is "unusual" */
  usualRangeLow: number;
  usualRangeHigh: number;
}

export const DEFAULT_COLLECTION_SETTINGS: CollectionSettings = {
  correctionWindowMin: 30,
  mismatchTolerancePct: 5,
  usualRangeLow: 0.5,
  usualRangeHigh: 2,
};

/** Reads `system_settings.collection`, falling back per field — same pattern as DispatchSettingsService. */
@Injectable()
export class CollectionSettingsService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly repo: Repository<SystemSettingEntity>,
  ) {}

  async get(): Promise<CollectionSettings> {
    const row = await this.repo.findOne({ where: { key: 'collection' } });
    const v = (row?.value ?? {}) as Partial<
      Record<keyof CollectionSettings, unknown>
    >;
    const d = DEFAULT_COLLECTION_SETTINGS;
    const num = (x: unknown, ok: (n: number) => boolean, fallback: number) =>
      typeof x === 'number' && Number.isFinite(x) && ok(x) ? x : fallback;

    const low = num(v.usualRangeLow, (n) => n > 0, d.usualRangeLow);
    const highRaw = num(v.usualRangeHigh, (n) => n > 0, d.usualRangeHigh);
    return {
      correctionWindowMin: num(
        v.correctionWindowMin,
        (n) => n >= 0,
        d.correctionWindowMin,
      ),
      mismatchTolerancePct: num(
        v.mismatchTolerancePct,
        (n) => n > 0,
        d.mismatchTolerancePct,
      ),
      usualRangeLow: low,
      usualRangeHigh: highRaw > low ? highRaw : d.usualRangeHigh,
    };
  }
}
