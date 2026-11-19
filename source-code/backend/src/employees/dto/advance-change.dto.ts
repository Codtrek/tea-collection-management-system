import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** A request to change an approved plan — needs someone else's approval (Salary-Advances-Addendum §10). */
export class RescheduleAdvanceDto {
  @IsNumber()
  @IsPositive()
  installmentAmount: number;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  startMonth: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  note: string;
}

export class DecideRescheduleDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

/** An early repayment in cash, recorded by an officer — reduces the balance, shortens the schedule. */
export class CashRepaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  paidOn: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  reference: string;
}
