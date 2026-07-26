import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { DbSettlementStatus } from './estate-map';

/**
 * EST-07/08 — one row per estate per period, denormalized with snapshot
 * rate/deduction values (no live join to grade_rates/fertilizer_dispatches —
 * neither exists yet). See init.sql's `settlements` table comment.
 */
@Entity('settlements')
export class SettlementEntity {
  /** Business key, e.g. 'SET-2026-07-001' — not a generated id. */
  @PrimaryColumn()
  id: string;

  @Column({ name: 'estate_id' })
  estateId: number;

  @Column({ name: 'estate_name' })
  estateName: string;

  @Column()
  period: string;

  @Column({ name: 'super_kg', type: 'decimal', precision: 10, scale: 2 })
  superKg: string;

  @Column({ name: 'normal_kg', type: 'decimal', precision: 10, scale: 2 })
  normalKg: string;

  @Column({ name: 'super_rate', type: 'decimal', precision: 8, scale: 2 })
  superRate: string;

  @Column({ name: 'normal_rate', type: 'decimal', precision: 8, scale: 2 })
  normalRate: string;

  @Column({ name: 'transport_cost', type: 'decimal', precision: 10, scale: 2 })
  transportCost: string;

  @Column({
    name: 'fertilizer_deduction',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  fertilizerDeduction: string;

  @Column({
    name: 'advance_deduction',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  advanceDeduction: string;

  @Column({ type: 'varchar' })
  status: DbSettlementStatus;

  @Column({ name: 'self_delivery', default: false })
  selfDelivery: boolean;

  @Column({ name: 'missing_bank', default: false })
  missingBank: boolean;

  @Column({ name: 'processed_by', type: 'varchar', nullable: true })
  processedBy: string | null;

  @Column({ name: 'processed_on', type: 'timestamp', nullable: true })
  processedOn: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
