import { IsObject } from 'class-validator';

/**
 * ADM-03 — a partial map of setting-key → JSON value. Each key is upserted;
 * keys not present are left untouched.
 */
export class UpdateSettingsDto {
  @IsObject()
  settings: Record<string, unknown>;
}
