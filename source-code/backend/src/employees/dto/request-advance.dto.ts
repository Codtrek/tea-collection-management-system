import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

/**
 * EMP-09/10 (request side) — no money moves yet, just a Pending request. The repayment plan
 * (Salary-Advances-Addendum §10): one deduction (default) or monthly installments, given as an
 * amount per month OR a number of months (the server fills in the other).
 */
export class RequestAdvanceDto {
  /** Formatted employee id, e.g. 'EMP-0001'. */
  @IsString()
  @MinLength(1)
  employeeId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @MinLength(1)
  reason: string;

  @IsOptional()
  @IsIn(['single', 'installments'])
  repayment?: 'single' | 'installments';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  installmentAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;

  /** 'YYYY-MM' — default: next calendar month */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  startMonth?: string;
}
