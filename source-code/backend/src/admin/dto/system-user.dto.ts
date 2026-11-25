import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PORTAL_ROLES, type PortalRole } from '../admin-map';

const PHONE = /^(?:\+94|0)\d{9}$/;
const PHONE_MSG = 'Enter a valid phone number (07XXXXXXXX)';

/** Add user — always starts from an HR employee (name + NIC come from that record). */
export class CreateSystemUserDto {
  @IsInt()
  employeeId: number;

  /** Defaults to the employee's contact number when omitted. */
  @IsOptional()
  @Matches(PHONE, { message: PHONE_MSG })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(120)
  email?: string;

  @IsIn(PORTAL_ROLES)
  role: PortalRole;
}

export class UpdateSystemUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Matches(PHONE, { message: PHONE_MSG })
  phone?: string;

  /** '' clears it. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsIn(PORTAL_ROLES)
  role?: PortalRole;

  /** Optional note for the audit row (role changes). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UserReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class LinkEmployeeDto {
  @IsInt()
  employeeId: number;
}
