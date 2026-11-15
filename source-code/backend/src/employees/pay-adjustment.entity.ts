import {
  Column,
  Entity,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A pay adjustment (Administration-Addendum §8): prepared by the Manager, approved or rejected by
 * the Administrator. Nothing reaches `pay_rates` until it is approved.
 */
@Entity('pay_adjustments')
export class PayAdjustmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'varchar' })
  scope: 'all' | 'role' | 'employees';

  @Column({ type: 'varchar', nullable: true })
  role: string | null;

  @Column({ type: 'varchar' })
  direction: 'increase' | 'decrease';

  @Column({ type: 'varchar' })
  kind: 'percent' | 'amount';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'int', default: 0 })
  rounding: 0 | 10 | 50;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'decrease_agreement', default: false })
  decreaseAgreement: boolean;

  @Column({
    name: 'total_monthly_change',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  totalMonthlyChange: string;

  @Column({ name: 'requested_by', type: 'varchar' })
  requestedBy: string;

  @Column({ name: 'requested_by_user_id', type: 'int', nullable: true })
  requestedByUserId: number | null;

  @Column({ name: 'requested_at', type: 'timestamp' })
  requestedAt: Date;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_by_user_id', type: 'int', nullable: true })
  decidedByUserId: number | null;

  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string | null;

  @OneToMany(() => PayAdjustmentLineEntity, (l) => l.adjustment, {
    cascade: true,
  })
  lines: PayAdjustmentLineEntity[];
}

/** One employee in an adjustment: what they were on, old → new rates, the monthly cost change. */
@Entity('pay_adjustment_lines')
export class PayAdjustmentLineEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PayAdjustmentEntity, (a) => a.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adjustment_id' })
  adjustment: PayAdjustmentEntity;

  @Column({ name: 'employee_id', type: 'int' })
  employeeId: number;

  @Column({ name: 'employee_name', type: 'varchar' })
  employeeName: string;

  @Column({ type: 'varchar' })
  category: 'factory' | 'office';

  @Column({ type: 'varchar' })
  role: string;

  @Column({ name: 'on_override' })
  onOverride: boolean;

  @Column({ name: 'old_day_rate', type: 'decimal', precision: 8, scale: 2 })
  oldDayRate: string;

  @Column({ name: 'old_day_ot_rate', type: 'decimal', precision: 8, scale: 2 })
  oldDayOtRate: string;

  @Column({ name: 'old_night_rate', type: 'decimal', precision: 8, scale: 2 })
  oldNightRate: string;

  @Column({
    name: 'old_night_ot_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
  })
  oldNightOtRate: string;

  @Column({ name: 'new_day_rate', type: 'decimal', precision: 8, scale: 2 })
  newDayRate: string;

  @Column({ name: 'new_day_ot_rate', type: 'decimal', precision: 8, scale: 2 })
  newDayOtRate: string;

  @Column({ name: 'new_night_rate', type: 'decimal', precision: 8, scale: 2 })
  newNightRate: string;

  @Column({
    name: 'new_night_ot_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
  })
  newNightOtRate: string;

  @Column({ name: 'hours_basis', type: 'decimal', precision: 8, scale: 2 })
  hoursBasis: string;

  @Column({ name: 'monthly_change', type: 'decimal', precision: 12, scale: 2 })
  monthlyChange: string;
}
