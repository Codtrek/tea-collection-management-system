import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { OwnerPaymentMethod } from '../estate-map';

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

  /** Defaults to 'bank'. A cash-paid owner may leave the bank fields empty. */
  @IsOptional()
  @IsIn(['bank', 'cash'])
  paymentMethod?: OwnerPaymentMethod;

  @ValidateIf((o: CreateEstateDto) => o.paymentMethod !== 'cash')
  @IsString()
  @MinLength(1)
  bank: string;

  @ValidateIf((o: CreateEstateDto) => o.paymentMethod !== 'cash')
  @IsString()
  @MinLength(1)
  branch: string;

  @ValidateIf((o: CreateEstateDto) => o.paymentMethod !== 'cash')
  @Matches(/^\d+$/, { message: 'Account number must be numeric' })
  account: string;
}
