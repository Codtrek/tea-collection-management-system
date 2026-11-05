import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * COL-02 exception entry, estate-first. The client sends only the estate it picked;
 * the server derives the route from the estate and today's agent from the route
 * resolver (so a cover is honoured). Display values are never trusted from the client.
 */
export class CreateExceptionDto {
  /** `estates.id` */
  @IsInt()
  estateId: number;

  @IsNumber()
  @IsPositive()
  reportedWeight: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsString()
  @MinLength(1)
  reason: string;
}
