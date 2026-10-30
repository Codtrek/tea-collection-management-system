import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A signed difference created when a correction is approved on a SETTLED delivery. The
 * paid settlement is never rewritten: the difference is carried into the next processed
 * settlement for the estate (`settlements.adjustment_amount`). Rates are the paying
 * settlement's snapshot, so the amount is exactly what the original payment used.
 */
@Entity('settlement_adjustments')
export class SettlementAdjustmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'estate_id', type: 'int' })
  estateId: number;

  @Column({ name: 'delivery_id' })
  deliveryId: string;

  @Column({ name: 'request_id', type: 'int' })
  requestId: number;

  @Column({ name: 'origin_settlement_id' })
  originSettlementId: string;

  @Column({ name: 'super_kg_delta', type: 'decimal', precision: 10, scale: 2 })
  superKgDelta: string;

  @Column({ name: 'normal_kg_delta', type: 'decimal', precision: 10, scale: 2 })
  normalKgDelta: string;

  @Column({ name: 'super_rate', type: 'decimal', precision: 8, scale: 2 })
  superRate: string;

  @Column({ name: 'normal_rate', type: 'decimal', precision: 8, scale: 2 })
  normalRate: string;

  @Column({ name: 'amount_rs', type: 'decimal', precision: 12, scale: 2 })
  amountRs: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'applied';

  @Column({ name: 'applied_settlement_id', type: 'varchar', nullable: true })
  appliedSettlementId: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
