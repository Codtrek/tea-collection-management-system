import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  IsPhoneNumber,
} from 'class-validator';
import { Match } from './match.decorator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsPhoneNumber('LK')
  phoneNumber: string;

  @IsNotEmpty()
  @Matches(/^(?:\d{9}[VX]|\d{12})$/, {
    message: 'NIC must be a valid old or new Sri Lankan NIC number',
  })
  nic: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Match('password', {
    message: 'Confirm password should match the password',
  })
  confirmPassword: string;
}
