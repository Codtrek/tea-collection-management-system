import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import type { AppGrade } from '../collection-map';

/** COL-04 edit form: weight, date, and grade. Estate/route are never editable here. */
export class UpdateCollectionDto {
  @IsNumber()
  @IsPositive()
  weightKg: number;

  @IsString()
  date: string;

  @IsOptional()
  @IsIn(['Super', 'Normal', 'Pending'])
  grade?: AppGrade;
}
