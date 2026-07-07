import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCollectionRecordDto {
  @IsInt()
  estateId: number;

  @IsNumber()
  actualWeightKg: number;

  @IsOptional()
  @IsInt()
  pickupRequestId?: number;

  @IsOptional()
  @IsInt()
  routeStopId?: number;

  @IsOptional()
  @IsBoolean()
  selfDelivered?: boolean;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}
