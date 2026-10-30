import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * EMP-12 — processes every currently-Pending payroll row (optionally scoped
 * to one period), mirroring Estates' single "Process N Settlements" action —
 * there's no per-row targeting in the portal UI.
 */
export class ProcessPayrollDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  period?: string;
}
