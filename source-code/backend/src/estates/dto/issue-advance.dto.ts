import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * EST-06 — money moves immediately; deducted by settlements per the repayment plan
 * (Estate-Owner-Advances-Addendum §4). No installment = one deduction for the whole amount.
 */
export class IssueAdvanceDto {
  /** Formatted estate id, e.g. 'EST-0001'. */
  @IsString()
  @MinLength(1)
  estateId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @MinLength(1)
  reason: string;

  /** per settlement period; omitted = one deduction */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  installmentAmount?: number;

  /** the first settlement period, 'YYYY-MM' — default: next calendar month */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  startMonth?: string;
}
