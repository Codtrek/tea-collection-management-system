import { IsString, MaxLength, MinLength } from 'class-validator';

/** Password change: an agent's first sign-in, or any portal user (incl. a temporary password). */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'The new password must be at least 8 characters' })
  @MaxLength(72) // bcrypt's input limit
  newPassword: string;
}
