import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateEntity } from '../estates/estate.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { CollectionRecordEntity } from './collection-record.entity';
import { GradeCorrectionRequestEntity } from './grade-correction-request.entity';

/**
 * A signed difference created when a correction is approved on a SETTLED delivery. The
 * paid settlement is never rewritten: the difference is carried into the next processed
 * settlement for the estate (`settlements.adjustment_amount`). Rates are the paying
 * settlement's snapshot, so the amount is exactly what the original payment used.
 */
@Entity('settlement_adjustments')
@Check(
  'settlement_adjustments_status_check',
  `"status" IN ('pending', 'applied')`,
)
@Index('idx_adjustments_estate_status', ['estateId', 'status'])
export class SettlementAdjustmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'estate_id', type: 'int' })
  @ForeignKey(() => EstateEntity, {
    name: 'settlement_adjustments_estate_id_fkey',
  })
  estateId: number;

  @Column({ name: 'delivery_id', type: 'varchar', length: 20 })
  @ForeignKey(() => CollectionRecordEntity, {
    name: 'settlement_adjustments_delivery_id_fkey',
  })
  deliveryId: string;

  /** One adjustment per correction: UNIQUE via `settlement_adjustments_request_id_key`. */
  @Column({ name: 'request_id', type: 'int', unique: true })
  @ForeignKey(() => GradeCorrectionRequestEntity, {
    name: 'settlement_adjustments_request_id_fkey',
  })
  requestId: number;

  @Column({ name: 'origin_settlement_id', type: 'varchar', length: 20 })
  @ForeignKey(() => SettlementEntity, {
    name: 'settlement_adjustments_origin_settlement_id_fkey',
  })
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

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: 'pending' | 'applied';

  @Column({
    name: 'applied_settlement_id',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  @ForeignKey(() => SettlementEntity, {
    name: 'settlement_adjustments_applied_settlement_id_fkey',
  })
  appliedSettlementId: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
