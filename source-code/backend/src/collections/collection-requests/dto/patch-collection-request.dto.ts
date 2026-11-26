import { IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class PatchCollectionRequestDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  estateId?: number;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
