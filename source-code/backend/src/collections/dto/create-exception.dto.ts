import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * COL-02 exception entry. The Estates module isn't wired to the backend yet, so
 * the portal still resolves estate/route/agent from its own fixtures and sends
 * the resolved display values here — see `estate_ref` on the entity.
 */
export class CreateExceptionDto {
  @IsString()
  @MinLength(1)
  estateId: string;

  @IsString()
  @MinLength(1)
  estateName: string;

  @IsString()
  @MinLength(1)
  route: string;

  @IsOptional()
  @IsString()
  agent?: string;

  @IsNumber()
  @IsPositive()
  reportedWeight: number;

  @IsString()
  date: string;

  @IsString()
  @MinLength(1)
  reason: string;
}
