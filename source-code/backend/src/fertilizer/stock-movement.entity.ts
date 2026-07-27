import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DbMovementType } from './fertilizer-map';

/**
 * FERT-02/03 — one row per stock event. `linkedRequestId` is nullable:
 * an Outgoing movement may fulfil an approved request or be ad-hoc (resolved
 * 2026-07-27, see PLAN.md) — both draw down the same batch.
 */
@Entity('stock_movements')
export class StockMovementEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_id' })
  batchId: number;

  @Column({ type: 'varchar' })
  type: DbMovementType;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2 })
  quantityKg: string;

  @Column({ name: 'movement_date', type: 'date' })
  movementDate: string;

  @Column({ type: 'varchar', nullable: true })
  destination: string | null;

  @Column({ name: 'linked_request_id', type: 'int', nullable: true })
  linkedRequestId: number | null;

  @Column({ type: 'varchar', nullable: true })
  supplier: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', nullable: true })
  recordedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
