import { IsInt, IsISO8601, IsNumber, IsOptional } from 'class-validator';

export class CreatePickupRequestDto {
  @IsInt()
  estateId: number;

  @IsInt()
  factoryId: number;

  @IsISO8601(
    { strict: true },
    { message: 'requestDate must be an ISO date string (YYYY-MM-DD)' },
  )
  requestDate: string;

  @IsOptional()
  @IsNumber()
  estimatedWeightKg?: number;

  @IsOptional()
  @IsNumber()
  gpsPinLat?: number;

  @IsOptional()
  @IsNumber()
  gpsPinLng?: number;
}
