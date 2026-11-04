import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * EST-02 registration. Mirrors the portal's `estateOwnerSchema` exactly.
 * Route is never submitted here — it's system-assigned (never manually
 * picked, architecture decision) and resolved server-side from location.
 */
export class CreateEstateDto {
  @IsString()
  @MinLength(1)
  ownerName: string;

  @Matches(/^(\d{12}|\d{9}[vVxX])$/, { message: 'Enter a valid NIC number' })
  nic: string;

  @Matches(/^(?:\+94|0)\d{9}$/, { message: 'Enter a valid contact number' })
  contact: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email' })
  email?: string;

  @IsString()
  @MinLength(1)
  estateName: string;

  @IsString()
  @MinLength(1)
  address: string;

  @IsString()
  @MinLength(1)
  location: string;

  @IsBoolean()
  selfDelivery: boolean;

  @IsString()
  @MinLength(1)
  bank: string;

  @IsString()
  @MinLength(1)
  branch: string;

  @Matches(/^\d+$/, { message: 'Account number must be numeric' })
  account: string;
}
