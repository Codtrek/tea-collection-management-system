import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Approve / reject a correction request. A note is required to reject (checked by the service). */
export class DecideCorrectionDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  note?: string;
}
