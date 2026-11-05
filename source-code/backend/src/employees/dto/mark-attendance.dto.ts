import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AttendanceRecordDto {
  /** Formatted employee id, e.g. 'EMP-0001'. */
  @IsString()
  @MinLength(1)
  employeeId: string;

  @IsIn(['Present', 'Absent', 'Leave', 'Half-day'])
  status: 'Present' | 'Absent' | 'Leave' | 'Half-day';

  // Hours are optional — omitted values are inferred server-side from
  // `status` (Present → 8 day hours, Half-day → 4, Absent/Leave → 0), so
  // the simple "Mark All Present" bulk path needs no manual entry.
  @IsOptional()
  @IsNumber()
  @Min(0)
  dayHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dayOtHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nightHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nightOtHours?: number;
}

/** EMP-05/08 — bulk roll-call for one date across many employees. */
export class MarkAttendanceDto {
  @IsDateString()
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
