import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/**
 * ADM-01 — one row per grade-rate version. Rates are effective-dated; the
 * newest `effectiveDate` is "current". Never mutated — a new rate is a new
 * row, so settlements that snapshotted an older rate never recalculate.
 */
@Entity('grade_rates')
@Index('idx_grade_rates_effective', ['effectiveDate'])
@Index('grade_rates_live_effective_key', ['effectiveDate'], {
  unique: true,
  where: `(cancelled_at IS NULL)`,
})
export class GradeRateEntity {
  /** Business key, e.g. 'GR-2026-0001'. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'super_rate', type: 'decimal', precision: 8, scale: 2 })
  superRate: string;

  @Column({ name: 'normal_rate', type: 'decimal', precision: 8, scale: 2 })
  normalRate: string;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'set_by', type: 'varchar', length: 100 })
  setBy: string;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;

  /** why the rates changed (Administration-Addendum §3); null on versions made before 2026-11-15 */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** a scheduled version cancelled before it started — kept, ignored from then on */
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
