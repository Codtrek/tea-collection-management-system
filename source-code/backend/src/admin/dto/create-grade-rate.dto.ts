import { IsDateString, IsNumber, IsPositive } from 'class-validator';

/** ADM-01 — publish a new effective-dated grade-rate version. */
export class CreateGradeRateDto {
  @IsNumber()
  @IsPositive()
  superRate: number;

  @IsNumber()
  @IsPositive()
  normalRate: number;

  @IsDateString()
  effectiveDate: string;
}
