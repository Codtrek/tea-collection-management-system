import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

/** EST-06 — money moves immediately; deducted at the estate's next processed settlement. */
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
}
