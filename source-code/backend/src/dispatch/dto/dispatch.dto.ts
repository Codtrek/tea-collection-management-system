import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class MarkAbsentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class CreateCoverRequestDto {
  @IsInt()
  routeId: number;

  @IsInt()
  agentId: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ReassignRouteDto {
  @IsInt()
  agentId: number;

  /** 'today' = one-day cover · 'permanent' = from now on (needs `approve`) */
  @IsIn(['today', 'permanent'])
  scope: 'today' | 'permanent';
}

export class PingDto {
  /** Device clock (ISO 8601) — when the fix was taken, not when it was uploaded. */
  @IsISO8601()
  recordedAt: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyM?: number;

  @IsOptional()
  @IsIn(['ping', 'checkin'])
  source?: 'ping' | 'checkin';
}

export class PingBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PingDto)
  pings: PingDto[];
}

export class PushTokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  platform?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Route-Schedule-Addendum §6 — the weekly pattern (0 = Sunday … 6 = Saturday). Empty = never. */
export class SetWeekdaysDto {
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];
}

/** Add or cancel one collection date. */
export class ScheduleOverrideDto {
  @Matches(ISO_DATE, { message: 'date must be YYYY-MM-DD.' })
  date: string;

  @IsIn(['ADD', 'CANCEL'])
  kind: 'ADD' | 'CANCEL';

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason: string;
}

/** Move one collection date to another. */
export class MoveScheduleDateDto {
  @Matches(ISO_DATE, { message: 'fromDate must be YYYY-MM-DD.' })
  fromDate: string;

  @Matches(ISO_DATE, { message: 'toDate must be YYYY-MM-DD.' })
  toDate: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason: string;
}
