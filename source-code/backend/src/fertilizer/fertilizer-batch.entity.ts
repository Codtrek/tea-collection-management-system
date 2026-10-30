import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DbItemCategory, DbUnit } from './fertilizer-map';

/**
 * FERT-01/03 — one row per received lot. FEFO allocation (`fertilizer.service`)
 * sorts live (non-expired, non-discarded) batches by `expiryDate`, never by
 * `receivedDate` or insertion order.
 */
@Entity('fertilizer_batches')
@Check(
  'fertilizer_batches_category_check',
  `"category" IN ('Fertilizer', 'Beneficiary')`,
)
@Check('fertilizer_batches_unit_check', `"unit" IN ('kg', 'bags')`)
@Index('idx_fertilizer_batches_item', ['item'])
export class FertilizerBatchEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  item: string;

  @Column({ type: 'varchar', length: 20, default: 'Fertilizer' })
  category: DbItemCategory;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2 })
  quantityKg: string;

  @Column({ type: 'varchar', length: 10, default: 'kg' })
  unit: DbUnit;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate: string;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier: string | null;

  @Column({ name: 'lot_number', type: 'varchar', length: 50, nullable: true })
  lotNumber: string | null;

  @Column({ name: 'quality_notes', type: 'text', nullable: true })
  qualityNotes: string | null;

  @Column({ default: false })
  discarded: boolean;

  @Column({
    name: 'last_updated_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lastUpdatedBy: string | null;

  @Column({ name: 'last_updated_on', type: 'timestamp', nullable: true })
  lastUpdatedOn: Date | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
