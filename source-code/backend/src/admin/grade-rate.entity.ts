import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * ADM-01 — one row per grade-rate version. Rates are effective-dated; the
 * newest `effectiveDate` is "current". Never mutated — a new rate is a new
 * row, so settlements that snapshotted an older rate never recalculate.
 */
@Entity('grade_rates')
export class GradeRateEntity {
  /** Business key, e.g. 'GR-2026-0001'. */
  @PrimaryColumn()
  id: string;

  @Column({ name: 'super_rate', type: 'decimal', precision: 8, scale: 2 })
  superRate: string;

  @Column({ name: 'normal_rate', type: 'decimal', precision: 8, scale: 2 })
  normalRate: string;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'set_by' })
  setBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
