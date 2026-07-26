import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

/** EMP-09/10 (request side) — no money moves yet, just a Pending request. */
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
}
