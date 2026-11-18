import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * RPT-04 — log a daily expense (Finance-Reports-Addendum §6). Mirrors the portal's zod schema in
 * `ExpenseEntryPage`; the no-future-date rule is re-checked server-side on the factory calendar.
 */
export class CreateExpenseDto {
  @IsInt()
  @IsPositive()
  categoryId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description: string;

  @IsIn(['cash', 'bank'])
  paidVia: 'cash' | 'bank';
}

/** RPT-04 — change an entry. `reason` is required outside the creator's edit window. */
export class UpdateExpenseDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsIn(['cash', 'bank'])
  paidVia?: 'cash' | 'bank';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** ADM-01 — add or change an expense category (Administrator). */
export class ExpenseCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsIn([true, false])
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
