import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * FERT-01/03 — a new stock lot. Reached two ways: directly (this DTO), or
 * implicitly via `POST /fertilizer/movements` with an Incoming movement and
 * no `batchId` (the "+ New batch" path in `StockMovementEntryPage`) — both
 * go through `FertilizerService.createBatch`.
 */
export class CreateBatchDto {
  @IsString()
  @MinLength(1)
  item: string;

  @IsIn(['Fertilizer', 'Beneficiary'])
  category: 'Fertilizer' | 'Beneficiary';

  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsIn(['kg', 'bags'])
  unit: 'kg' | 'bags';

  @IsDateString()
  receivedDate: string;

  @IsDateString()
  expiryDate: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  qualityNotes?: string;
}
