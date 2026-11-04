import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * FERT-07 — log a phoned-in request on an estate owner's behalf. Always
 * `origin: 'web'` (the service sets it, not the client) — mobile-originated
 * requests are Phase 3 and out of scope here.
 */
export class LogRequestDto {
  /** Formatted estate id, e.g. 'EST-0001'. */
  @IsString()
  @MinLength(1)
  estateId: string;

  @IsString()
  @MinLength(1)
  item: string;

  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
