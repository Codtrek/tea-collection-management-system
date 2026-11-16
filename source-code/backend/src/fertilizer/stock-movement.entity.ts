import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateEntity } from '../estates/estate.entity';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import type { DbMovementType, WriteOffReason } from './fertilizer-map';

/**
 * FERT-02/03 — one row per stock event (Incoming, Outgoing, or a Write-off of stock that
 * left the books without going to anyone). `linkedRequestId` is nullable:
 * an Outgoing movement may fulfil an approved request or be ad-hoc (resolved
 * 2026-07-27, see PLAN.md) — both draw down the same batch.
 */
@Entity('stock_movements')
@Check(
  'stock_movements_type_check',
  `"type" IN ('Incoming', 'Outgoing', 'Write-off')`,
)
@Index('idx_stock_movements_batch', ['batchId'])
@Index('idx_stock_movements_estate', ['estateId'])
@Check(
  'stock_movements_write_off_reason_check',
  `((write_off_reason)::text = ANY ((ARRAY['expired'::character varying, 'damaged'::character varying, 'other'::character varying])::text[]))`,
)
@Check(
  'stock_movements_write_off_reason_required',
  `(((type)::text <> 'Write-off'::text) OR (write_off_reason IS NOT NULL))`,
)
export class StockMovementEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_id', type: 'int' })
  @ForeignKey(() => FertilizerBatchEntity, {
    name: 'stock_movements_batch_id_fkey',
  })
  batchId: number;

  @Column({ type: 'varchar', length: 10 })
  type: DbMovementType;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2 })
  quantityKg: string;

  @Column({
    name: 'movement_date',
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  movementDate: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destination: string | null;

  /**
   * Structured estate link (Estate Owner Lifetime History slice) —
   * `destination` above is a free-text label, so this is what billing/the
   * lifetime timeline actually read. Set from a linked request's estate, or
   * passed explicitly for an ad-hoc dispatch that's billable to an estate.
   */
  @Column({ name: 'estate_id', type: 'int', nullable: true })
  @ForeignKey(() => EstateEntity, { name: 'stock_movements_estate_id_fkey' })
  estateId: number | null;

  @Column({ name: 'linked_request_id', type: 'int', nullable: true })
  @ForeignKey(() => FertilizerRequestEntity, {
    name: 'stock_movements_linked_request_id_fkey',
  })
  linkedRequestId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier: string | null;

  /** Write-off only (expired / damaged / other); null on Incoming and Outgoing. */
  @Column({
    name: 'write_off_reason',
    type: 'varchar',
    nullable: true,
    length: 10,
  })
  writeOffReason: WriteOffReason | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', length: 100, nullable: true })
  recordedBy: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
