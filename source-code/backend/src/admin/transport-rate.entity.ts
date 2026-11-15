import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * ADM-01 — one effective-dated transport version (Administration-Addendum §4). Inserted, never
 * edited; a scheduled version can be cancelled before it starts. Only `fixed_month` (a monthly
 * charge per estate, in `rate`) is calculated; per km / per kg are kept for the future.
 */
@Entity('transport_rates')
export class TransportRateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ type: 'varchar' })
  basis: 'per_km' | 'per_kg' | 'fixed_month';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rate: string;

  @Column({ name: 'minimum_charge', type: 'decimal', precision: 10, scale: 2 })
  minimumCharge: string;

  @Column({ name: 'basis_confirmed', default: false })
  basisConfirmed: boolean;

  /** a row that was never charged (the seeded per-km placeholder) */
  @Column({ name: 'never_applied', default: false })
  neverApplied: boolean;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'set_by', type: 'varchar' })
  setBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancelled_by', type: 'varchar', nullable: true })
  cancelledBy: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;
}
