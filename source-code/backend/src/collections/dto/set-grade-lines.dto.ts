import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { AppGrade } from '../collection-map';

export class GradeLineDto {
  @IsIn(['Super', 'Normal'])
  grade: AppGrade;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  weightKg: number;
}

/**
 * Factory-side grading at receiving. Replaces the delivery's grade lines wholesale;
 * at most one line per grade (a duplicate is a 409). Never sent by agents or owners.
 * `reason` is required (by the service) only when editing an already-graded delivery
 * inside its OPEN window.
 */
export class SetGradeLinesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => GradeLineDto)
  lines: GradeLineDto[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  reason?: string;
}
