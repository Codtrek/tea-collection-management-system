import { IsDateString, IsInt, IsOptional, Matches, MaxLength, Min } from 'class-validator';
import { RegisterDto } from './register.dto';

export class RegisterEstateManagerDto extends RegisterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  estateId?: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Enter the date of birth as YYYY-MM-DD.' })
  @IsDateString({ strict: true })
  dateOfBirth: string;

  @Matches(/\S/, { message: 'Enter the manager name.' })
  @MaxLength(32)
  declare name: string;
}
