import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Effective-dated price per item (Rs./kg), set by the Administrator. A request snapshots the
 * version in force when it's approved, so a later price change never alters it — the same
 * rule as grade rates (ADM-01). Past versions are never edited.
 */
@Entity('fertilizer_item_prices')
export class FertilizerItemPriceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  item: string;

  @Column({ name: 'rate_per_kg', type: 'decimal', precision: 8, scale: 2 })
  ratePerKg: string;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'set_by', type: 'varchar' })
  setBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
