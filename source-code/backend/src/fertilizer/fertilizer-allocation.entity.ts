import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import type { AllocationState } from './fertilizer-map';

/**
 * FEFO commitment: `qtyKg` of one batch promised to one request. Committed stock is the sum
 * of ACTIVE rows — the only definition (Fertilizer-Delivery-Addendum §5). Handover turns
 * rows 'picked' (the stock left the store); check-in turns them active again; cancel /
 * reject / an owner's refusal turns them 'released'. Rows are split, never overdrawn.
 */
@Entity('fertilizer_allocations')
@Check('fertilizer_allocations_qty_kg_check', `(qty_kg > (0)::numeric)`)
@Check(
  'fertilizer_allocations_state_check',
  `((state)::text = ANY ((ARRAY['active'::character varying, 'picked'::character varying, 'released'::character varying])::text[]))`,
)
@Index('idx_fert_alloc_batch_state', ['batchId', 'state'])
@Index('idx_fert_alloc_request', ['requestId'])
export class FertilizerAllocationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  @ForeignKey(() => FertilizerRequestEntity, {
    name: 'fertilizer_allocations_request_id_fkey',
  })
  requestId: number;

  @Column({ name: 'batch_id' })
  @ForeignKey(() => FertilizerBatchEntity, {
    name: 'fertilizer_allocations_batch_id_fkey',
  })
  batchId: number;

  @Column({ name: 'qty_kg', type: 'decimal', precision: 10, scale: 2 })
  qtyKg: string;

  @Column({ type: 'varchar', default: 'active', length: 10 })
  state: AllocationState;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;
}
