import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { GradeLineDto } from './set-grade-lines.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** New values + a required reason, for a LOCKED or SETTLED delivery. */
export class RequestCorrectionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => GradeLineDto)
  lines: GradeLineDto[];

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
