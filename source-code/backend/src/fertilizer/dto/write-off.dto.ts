import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { WRITE_OFF_REASONS, type WriteOffReason } from '../fertilizer-map';

/** Expiry Alerts / FERT-03 "Write off" — quantity defaults to everything left in the batch. */
export class WriteOffDto {
  @IsIn(WRITE_OFF_REASONS)
  reason: WriteOffReason;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantityKg?: number;

  /** Required when the reason is "other". */
  @ValidateIf((o: WriteOffDto) => o.reason === 'other' || o.note !== undefined)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note?: string;
}
