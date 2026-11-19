import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Administration-Addendum §8 — who, the change, from when (preview and prepare). */
export class PayAdjustmentDto {
  @IsIn(['all', 'role', 'employees'])
  scope: 'all' | 'role' | 'employees';

  /** scope = role */
  @IsOptional()
  @IsString()
  role?: string;

  /** scope = employees: 'EMP-0002' ids */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  employeeIds?: string[];

  @IsIn(['increase', 'decrease'])
  direction: 'increase' | 'decrease';

  @IsIn(['percent', 'amount'])
  kind: 'percent' | 'amount';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsIn([0, 10, 50])
  rounding: 0 | 10 | 50;

  @IsDateString()
  effectiveDate: string;

  /** prepare only */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** a decrease: the employees' written agreement has been obtained */
  @IsOptional()
  @IsBoolean()
  decreaseAgreement?: boolean;
}

export class PayAdjustmentDecisionDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
