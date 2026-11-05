import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A Poya / public holiday for a year (Attendance-Leave-Addendum §Holidays). */
export class HolidayDto {
  @Matches(DAY)
  date: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsIn(['poya', 'public'])
  type: 'poya' | 'public';

  /** omitted = the type's default */
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsBoolean()
  workAllowed?: boolean;
}

export class HolidayTypeDto {
  @IsBoolean()
  paid: boolean;

  @IsBoolean()
  workAllowed: boolean;
}

/** A new weekly holiday for a category, from `effectiveFrom` (today or later) on. */
export class WeeklyRuleDto {
  @IsIn(['factory', 'office'])
  category: 'factory' | 'office';

  @IsArray()
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  halfDayWeekday?: number | null;

  @Matches(DAY)
  effectiveFrom: string;
}

export class RestDayDto {
  /** null = back to the category's weekly holiday */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number | null;

  @Matches(DAY)
  effectiveFrom: string;
}

/** "Declare holiday" — a closure or category holiday over one date or a range. */
export class DeclareHolidayDto {
  @Matches(DAY)
  from: string;

  @Matches(DAY)
  to: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason: string;

  @IsBoolean()
  paid: boolean;

  @IsIn(['all', 'factory', 'office'])
  appliesTo: 'all' | 'factory' | 'office';

  /** does tea collection stop those days? (yes → the routes are cancelled for the date) */
  @IsBoolean()
  collectionStops: boolean;

  /** what to do with attendance already marked on those dates */
  @IsOptional()
  @IsIn(['keep', 'clear'])
  attendance?: 'keep' | 'clear';

  /** same-day closure for all employees — in force now, the Administrator reviews it after */
  @IsOptional()
  @IsBoolean()
  emergency?: boolean;
}

/** The Administrator's approve / reject (keep / revert for an emergency) — always with a reason. */
export class DecideRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason: string;
}

export class CancelHolidayDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
