import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * EST-08 — processes the Pending settlements of one period (e.g. 'July 2026'), the month the
 * period view is showing (Settlement-Period-View-Addendum). Omitted = every pending row.
 */
export class ProcessSettlementsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  period?: string;
}
