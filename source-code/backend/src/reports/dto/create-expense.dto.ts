import {
  IsDateString,
  IsIn,
  IsNumber,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import type { ExpenseCategory } from '../reports-map';

/**
 * RPT-04 — log a manual daily expense. Mirrors the portal's zod schema in
 * `ExpenseEntryPage`: category enum, positive amount, a non-future date, and
 * a non-empty description.
 */
export class CreateExpenseDto {
  @IsIn(['Utilities', 'Maintenance', 'Miscellaneous', 'Other'])
  category: ExpenseCategory;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @MinLength(1)
  description: string;
}
