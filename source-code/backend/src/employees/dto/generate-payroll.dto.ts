import { IsString, MinLength } from 'class-validator';

/** EMP-11 — aggregates attendance × rates into Pending payroll rows for the period. */
export class GeneratePayrollDto {
  /** e.g. 'July 2026' — matches `employee_attendance` rows whose month/year fall in this period. */
  @IsString()
  @MinLength(1)
  period: string;
}
