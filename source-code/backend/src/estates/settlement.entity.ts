import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { EstateEntity } from './estate.entity';
import type { DbSettlementStatus } from './estate-map';

/**
 * EST-07/08 — one row per estate per period, denormalized with snapshot
 * rate/deduction values (no live join to grade_rates/fertilizer_dispatches —
 * neither exists yet). See init.sql's `settlements` table comment.
 */
@Entity('settlements')
@Check('settlements_status_check', `"status" IN ('pending', 'processed')`)
@Index('idx_settlements_estate', ['estateId'])
@Index('idx_settlements_status', ['status'])
export class SettlementEntity {
  /** Business key, e.g. 'SET-2026-07-001' — not a generated id. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'estate_id', type: 'int' })
  @ForeignKey(() => EstateEntity, { name: 'settlements_estate_id_fkey' })
  estateId: number;

  @Column({ name: 'estate_name', type: 'varchar', length: 100 })
  estateName: string;

  @Column({ type: 'varchar', length: 20 })
  period: string;

  @Column({
    name: 'super_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  superKg: string;

  @Column({
    name: 'normal_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  normalKg: string;

  @Column({ name: 'super_rate', type: 'decimal', precision: 8, scale: 2 })
  superRate: string;

  @Column({ name: 'normal_rate', type: 'decimal', precision: 8, scale: 2 })
  normalRate: string;

  @Column({
    name: 'transport_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  transportCost: string;

  @Column({
    name: 'fertilizer_deduction',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  fertilizerDeduction: string;

  @Column({
    name: 'advance_deduction',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  advanceDeduction: string;

  /**
   * Signed Rs. carried in from approved grading corrections on already-SETTLED deliveries
   * (settlement_adjustments). Set when the settlement is processed; the past is never rewritten.
   */
  @Column({
    name: 'adjustment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  adjustmentAmount: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: DbSettlementStatus;

  @Column({ name: 'self_delivery', default: false })
  selfDelivery: boolean;

  @Column({ name: 'missing_bank', default: false })
  missingBank: boolean;

  @Column({
    name: 'processed_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  processedBy: string | null;

  @Column({ name: 'processed_on', type: 'timestamp', nullable: true })
  processedOn: Date | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
