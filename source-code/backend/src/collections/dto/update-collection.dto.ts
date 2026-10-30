import { IsNumber, IsPositive, IsString } from 'class-validator';

/**
 * COL-04 edit form: ESTATE weight and date only. Estate/route are never editable, and
 * grade is never editable here — grading is factory-side via PUT /collections/:id/grade-lines.
 */
export class UpdateCollectionDto {
  @IsNumber()
  @IsPositive()
  weightKg: number;

  @IsString()
  date: string;
}
