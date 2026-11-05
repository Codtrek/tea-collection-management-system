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
