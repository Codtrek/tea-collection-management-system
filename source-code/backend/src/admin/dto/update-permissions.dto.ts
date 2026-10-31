import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * ADM-02 — the permission matrix is sent as a flat list of cells (easier to
 * validate than a nested Record). The portal flattens its matrix before POST.
 */
export class PermissionEntryDto {
  @IsIn(['Administrator', 'Officer', 'Manager'])
  role: 'Administrator' | 'Officer' | 'Manager';

  @IsString()
  @MinLength(1)
  module: string;

  @IsIn(['none', 'view', 'edit', 'approve'])
  level: 'none' | 'view' | 'edit' | 'approve';
}

export class UpdatePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PermissionEntryDto)
  entries: PermissionEntryDto[];
}
