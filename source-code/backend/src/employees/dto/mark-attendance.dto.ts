import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AttendanceRecordDto {
  /** Formatted employee id, e.g. 'EMP-0001'. */
  @IsString()
  @MinLength(1)
  employeeId: string;

  @IsIn(['Present', 'Absent', 'Leave', 'Half-day', 'Short leave'])
  status: 'Present' | 'Absent' | 'Leave' | 'Half-day' | 'Short leave';

  /** Half-day: which half was worked */
  @IsOptional()
  @IsIn(['AM', 'PM'])
  half?: 'AM' | 'PM';

  /** Short leave: 'HH:MM' out and back */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  shortOut?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  shortBack?: string;
  // Hours are set server-side from the status (attendance-rules.ts): Present / Worked on
  // holiday / Short leave 8, Half-day 4, Absent / Leave 0 — payroll pays hours × rates.
}

/** EMP-05/08 — bulk roll-call for one date across many employees (rules: attendance-rules.ts). */
export class MarkAttendanceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  /** required for a day older than the edit window (Factory Manager) */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
