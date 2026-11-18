import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * EST-08 — processes the ready drafts of one month (Settlement-Addendum). `month` is 'YYYY-MM';
 * `period` ('July 2026') is still accepted. `expectedNet` is the total net payable the officer
 * reviewed and re-typed — when the figures moved since, nothing is processed.
 */
export class ProcessSettlementsDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  period?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  expectedNet?: number;
}

/** Prepare (or recalculate) the drafts of one month. */
export class PrepareSettlementsDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month: string;
}

/** A Manager leaves a delivery out of a month, with a reason; it rolls to the next month. */
export class ExcludeDeliveryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month: string;

  @IsString()
  @MinLength(5)
  reason: string;
}
