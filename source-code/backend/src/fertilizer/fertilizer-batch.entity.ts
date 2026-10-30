import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DbItemCategory, DbUnit } from './fertilizer-map';

/**
 * FERT-01/03 — one row per received lot. FEFO allocation (`fertilizer.service`)
 * sorts live (non-expired, non-discarded) batches by `expiryDate`, never by
 * `receivedDate` or insertion order.
 */
@Entity('fertilizer_batches')
export class FertilizerBatchEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  item: string;

  @Column({ type: 'varchar' })
  category: DbItemCategory;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2 })
  quantityKg: string;

  @Column({ type: 'varchar' })
  unit: DbUnit;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate: string;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: string;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', nullable: true })
  supplier: string | null;

  @Column({ name: 'lot_number', type: 'varchar', nullable: true })
  lotNumber: string | null;

  @Column({ name: 'quality_notes', type: 'text', nullable: true })
  qualityNotes: string | null;

  @Column({ default: false })
  discarded: boolean;

  @Column({ name: 'last_updated_by', type: 'varchar', nullable: true })
  lastUpdatedBy: string | null;

  @Column({ name: 'last_updated_on', type: 'timestamp', nullable: true })
  lastUpdatedOn: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
