import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * EMP-10 (approval side) — Officer or Administrator; Manager rejected in the service. Never the
 * requester or the employee themself. An approver may change the plan (installment / months /
 * start month); a change needs `note`.
 */
export class DecideAdvanceDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  /** required to reject (checked in the service); optional note on an approval */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  installmentAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  startMonth?: string;

  /** required when the plan above differs from the requested one */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
