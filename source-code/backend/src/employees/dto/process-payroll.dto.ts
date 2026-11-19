import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** A bank-paid employee with no bank details, left out of this run — the reason is required. */
export class PayrollExclusionDto {
  /** 'EMP-0007' */
  @IsString()
  employeeId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason: string;
}

/**
 * EMP-12 — processes every currently-Pending payroll row (optionally scoped
 * to one period), mirroring Estates' single "Process N Settlements" action —
 * there's no per-row targeting in the portal UI. A bank-paid employee with no
 * bank details blocks the run unless they're listed in `exclusions` with a reason.
 */
export class ProcessPayrollDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  period?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollExclusionDto)
  exclusions?: PayrollExclusionDto[];
}
