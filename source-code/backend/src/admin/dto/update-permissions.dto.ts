import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MODULE_KEYS, type ModuleKey } from '../admin-map';

/**
 * ADM-02 — the permission matrix is sent as a flat list of cells (easier to
 * validate than a nested Record). The portal flattens its matrix before POST.
 */
export class PermissionEntryDto {
  @IsIn(['Administrator', 'Officer', 'Manager'])
  role: 'Administrator' | 'Officer' | 'Manager';

  @IsIn(MODULE_KEYS, { message: 'Unknown permission key' })
  module: ModuleKey;

  @IsIn(['none', 'view', 'edit', 'approve'])
  level: 'none' | 'view' | 'edit' | 'approve';
}

export class UpdatePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PermissionEntryDto)
  entries: PermissionEntryDto[];

  /** Required (server-checked) when a change touches `approve` or a finance key. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
