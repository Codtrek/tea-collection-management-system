import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Effective-dated price per item (Rs./kg), set by the Administrator. A request snapshots the
 * version in force when it's approved, so a later price change never alters it — the same
 * rule as grade rates (ADM-01). Past versions are never edited.
 */
@Entity('fertilizer_item_prices')
@Unique('fertilizer_item_prices_item_effective_date_key', [
  'item',
  'effectiveDate',
])
@Check(
  'fertilizer_item_prices_rate_per_kg_check',
  `(rate_per_kg >= (0)::numeric)`,
)
export class FertilizerItemPriceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  item: string;

  @Column({ name: 'rate_per_kg', type: 'decimal', precision: 8, scale: 2 })
  ratePerKg: string;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'set_by', type: 'varchar', length: 100 })
  setBy: string;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
