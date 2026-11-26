import { IsNumber, Matches, Max, MaxLength, Min } from 'class-validator';

export class RegisterOwnedEstateDto {
  @Matches(/\S/, { message: 'Enter the estate name.' })
  @MaxLength(100)
  name: string;

  @Matches(/\S/, { message: 'Enter the estate address.' })
  address: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  areaAcres: number;
}
