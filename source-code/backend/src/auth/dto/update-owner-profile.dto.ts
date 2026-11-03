import { IsEmail, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateOwnerProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @Matches(/\S/, { message: 'Name cannot be blank.' })
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^07\d{8}$/, { message: 'Enter a valid 10-digit mobile number.' })
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== '')
  @IsEmail()
  @MaxLength(100)
  email?: string;
}

