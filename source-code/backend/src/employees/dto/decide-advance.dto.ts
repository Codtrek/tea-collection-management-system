import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** EMP-10 (approval side) — Officer or Administrator; Manager rejected in the service. */
export class DecideAdvanceDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  /** required to reject (checked in the service); optional note on an approval */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
