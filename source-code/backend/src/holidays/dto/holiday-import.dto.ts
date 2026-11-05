import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** An uploaded .ics / CSV (the portal sends only the chosen year's events). */
export class ImportFileDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsIn(['ics', 'csv'])
  format: 'ics' | 'csv';

  @IsString()
  @MinLength(1)
  @MaxLength(95_000)
  content: string;
}

export class ImportRowDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  uid: string;

  @Matches(DAY)
  date: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsIn(['poya', 'public'])
  type: 'poya' | 'public';

  @IsBoolean()
  include: boolean;
}

/** The reviewed preview — ticked rows are saved, unticked ones remembered as skipped. */
export class ImportConfirmDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsIn(['google', 'file'])
  source: 'google' | 'file';

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows: ImportRowDto[];
}

/** Accept or ignore one re-sync difference. */
export class ResyncItemDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsIn(['added', 'removed', 'changed'])
  kind: 'added' | 'removed' | 'changed';

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  uid: string;

  /** for an added holiday: the type the Administrator picked */
  @IsOptional()
  @IsIn(['poya', 'public'])
  type?: 'poya' | 'public';
}
