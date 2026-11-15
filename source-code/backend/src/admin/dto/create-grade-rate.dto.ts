import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** ADM-01 — publish a new effective-dated grade-rate version (reason required). */
export class CreateGradeRateDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  superRate: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  normalRate: number;

  @IsDateString()
  effectiveDate: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

/** ADM-01 — publish a new transport-rate version (Administration-Addendum §4). */
export class CreateTransportRateDto {
  @IsIn(['per_km', 'per_kg'])
  basis: 'per_km' | 'per_kg';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  rate: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimumCharge: number;

  @IsDateString()
  effectiveDate: string;

  /** the factory has confirmed this is how it charges */
  @IsBoolean()
  basisConfirmed: boolean;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

/** Cancel a scheduled version before it starts. */
export class CancelVersionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

/** ADM-01 General Info — the factory's details and bank account. */
export class UpdateFactoryProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(60)
  registrationNo: string;

  @IsString()
  @MaxLength(250)
  address: string;

  @IsString()
  @MaxLength(30)
  contact: string;

  @IsString()
  @MaxLength(120)
  email: string;

  @IsString()
  @MaxLength(80)
  bank: string;

  @IsString()
  @MaxLength(80)
  branch: string;

  @IsString()
  @MaxLength(120)
  accountName: string;

  /** omit to keep the account number on record; send the full number to change it */
  @IsOptional()
  @IsString()
  @MaxLength(34)
  accountNumber?: string;
}
