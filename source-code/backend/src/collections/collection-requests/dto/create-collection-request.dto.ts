import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CollectionRequestDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  estateId!: number;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
