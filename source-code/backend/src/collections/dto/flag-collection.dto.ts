import { IsString, MinLength } from 'class-validator';

/** Flag-for-Correction — audit-tracked request against a locked (Confirmed) record. */
export class FlagCollectionDto {
  @IsString()
  @MinLength(1)
  reason: string;
}
