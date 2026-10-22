import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { AllocationState } from './fertilizer-map';

/**
 * FEFO commitment: `qtyKg` of one batch promised to one request. Committed stock is the sum
 * of ACTIVE rows — the only definition (Fertilizer-Delivery-Addendum §5). Handover turns
 * rows 'picked' (the stock left the store); check-in turns them active again; cancel /
 * reject / an owner's refusal turns them 'released'. Rows are split, never overdrawn.
 */
@Entity('fertilizer_allocations')
export class FertilizerAllocationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  requestId: number;

  @Column({ name: 'batch_id' })
  batchId: number;

  @Column({ name: 'qty_kg', type: 'decimal', precision: 10, scale: 2 })
  qtyKg: string;

  @Column({ type: 'varchar', default: 'active' })
  state: AllocationState;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;
}
