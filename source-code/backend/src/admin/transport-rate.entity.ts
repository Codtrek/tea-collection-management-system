import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * ADM-01 — one effective-dated transport version (Administration-Addendum §4). Inserted, never
 * edited; a scheduled version can be cancelled before it starts. Only `fixed_month` (a monthly
 * charge per estate, in `rate`) is calculated; per km / per kg are kept for the future.
 */
@Entity('transport_rates')
@Check(
  'transport_rates_basis_check',
  `((basis)::text = ANY ((ARRAY['per_km'::character varying, 'per_kg'::character varying, 'fixed_month'::character varying])::text[]))`,
)
@Check(
  'transport_rates_minimum_charge_check',
  `(minimum_charge >= (0)::numeric)`,
)
@Check('transport_rates_rate_check', `(rate >= (0)::numeric)`)
@Index('transport_rates_live_effective_key', ['effectiveDate'], {
  unique: true,
  where: `(cancelled_at IS NULL)`,
})
export class TransportRateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ type: 'varchar', length: 11 })
  basis: 'per_km' | 'per_kg' | 'fixed_month';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rate: string;

  @Column({
    name: 'minimum_charge',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  minimumCharge: string;

  @Column({ name: 'basis_confirmed', default: false })
  basisConfirmed: boolean;

  /** a row that was never charged (the seeded per-km placeholder) */
  @Column({ name: 'never_applied', default: false })
  neverApplied: boolean;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'set_by', type: 'varchar', length: 100 })
  setBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({
    name: 'cancelled_by',
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  cancelledBy: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;
}
