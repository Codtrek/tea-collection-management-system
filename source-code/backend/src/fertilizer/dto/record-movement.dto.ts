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
 * FERT-02/03. Shape-only validation here; the cross-field rules the
 * portal's zod schema enforces client-side (batchId required unless
 * creating a new batch, destination required for Outgoing, quantity vs.
 * batch/remainder limits) are re-checked server-side in
 * `FertilizerService.recordMovement`, same split as Employees' DTOs.
 *
 * `linkedRequest` is optional even for Outgoing — ad-hoc dispatch (no
 * approved request behind it) is allowed alongside request-linked dispatch
 * (resolved 2026-07-27, see PLAN.md).
 */
export class RecordMovementDto {
  @IsIn(['Incoming', 'Outgoing'])
  type: 'Incoming' | 'Outgoing';

  /** Formatted batch id, e.g. 'FB-0001'. Omit on Incoming to create a new batch from the fields below. */
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Incoming — new batch creation (required together when `batchId` is omitted)
  @IsOptional()
  @IsString()
  @MinLength(1)
  item?: string;

  @IsOptional()
  @IsIn(['Fertilizer', 'Beneficiary'])
  category?: 'Fertilizer' | 'Beneficiary';

  @IsOptional()
  @IsIn(['kg', 'bags'])
  unit?: 'kg' | 'bags';

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  // Outgoing
  @IsOptional()
  @IsString()
  destination?: string;

  /** Formatted request id, e.g. 'FR-2026-0140'. */
  @IsOptional()
  @IsString()
  linkedRequest?: string;
}
