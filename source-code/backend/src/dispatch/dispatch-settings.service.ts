import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';

export interface DispatchSettings {
  /** minutes a cover request waits for an answer before it expires */
  coverRequestTimeoutMin: number;
  /** 'HH:MM' factory-local; an agent with no shift start after this raises an alert */
  shiftStartTime: string;
}

export const DEFAULT_DISPATCH_SETTINGS: DispatchSettings = {
  coverRequestTimeoutMin: 15,
  shiftStartTime: '06:00',
};

@Injectable()
export class DispatchSettingsService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly repo: Repository<SystemSettingEntity>,
  ) {}

  /** Reads `system_settings.dispatch`, falling back per-field to the defaults. */
  async get(): Promise<DispatchSettings> {
    const row = await this.repo.findOne({ where: { key: 'dispatch' } });
    const v = (row?.value ?? {}) as Partial<DispatchSettings>;
    const timeout = Number(v.coverRequestTimeoutMin);
    return {
      coverRequestTimeoutMin:
        Number.isFinite(timeout) && timeout > 0
          ? timeout
          : DEFAULT_DISPATCH_SETTINGS.coverRequestTimeoutMin,
      shiftStartTime:
        typeof v.shiftStartTime === 'string' &&
        /^\d{2}:\d{2}$/.test(v.shiftStartTime)
          ? v.shiftStartTime
          : DEFAULT_DISPATCH_SETTINGS.shiftStartTime,
    };
  }
}
