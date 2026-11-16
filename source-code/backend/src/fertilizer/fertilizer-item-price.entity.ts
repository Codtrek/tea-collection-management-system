import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Item Prices (Administration-Addendum §5) — the ONE selling-price source for fertilizer and
 * other items given to estate owners. Effective-dated and set by the Administrator, per kg or per
 * bag of `bagSizeKg`. `ratePerKg` is the derived per-kg price; a request snapshots the version in
 * force when it's approved, so a later price change never alters it (same rule as grade rates).
 * Past versions are never edited; a scheduled one can be cancelled before it starts.
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

  @Column({ type: 'varchar', default: 'kg' })
  unit: 'kg' | 'bag';

  @Column({
    name: 'bag_size_kg',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  bagSizeKg: string | null;

  /** Rs per unit (per kg, or per bag) as the Administrator entered it */
  @Column({ name: 'price_per_unit', type: 'decimal', precision: 10, scale: 2 })
  pricePerUnit: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancelled_by', type: 'varchar', nullable: true })
  cancelledBy: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;
}
