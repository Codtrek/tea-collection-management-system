import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class RouteStopInputDto {
  @IsInt()
  estateId: number;

  @IsBoolean()
  hasTeaPickup: boolean;

  @IsBoolean()
  hasFertilizerDelivery: boolean;
}

export class CreateRouteDto {
  @IsInt()
  factoryId: number;

  @IsInt()
  collectorId: number;

  @IsISO8601(
    { strict: true },
    { message: 'routeDate must be an ISO date string (YYYY-MM-DD)' },
  )
  routeDate: string;

  @IsOptional()
  @IsInt()
  truckId?: number;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopInputDto)
  stops: RouteStopInputDto[];
}
