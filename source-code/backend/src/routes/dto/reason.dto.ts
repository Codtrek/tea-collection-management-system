import { IsString } from 'class-validator';

export class ReasonDto {
  @IsString()
  reason: string;
}
