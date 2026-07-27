import { IsIn, IsNumber, IsOptional, IsPositive } from 'class-validator';

/**
 * FERT-06 — Administrator only (portal: `fertilizer: 'approve'`; Officer's
 * `edit` level covers logging/dispatch but not the decision). `approvedQtyKg`
 * applies to `approve` only — full or partial (< quantityKg) fulfilment;
 * `reject`/`cancel` are terminal and ignore it.
 */
export class DecideRequestDto {
  @IsIn(['approve', 'reject', 'cancel'])
  decision: 'approve' | 'reject' | 'cancel';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  approvedQtyKg?: number;
}
