import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { EmployeeEntity } from './employee.entity';

/**
 * A pay adjustment (Administration-Addendum §8): prepared by the Manager, approved or rejected by
 * the Administrator. Nothing reaches `pay_rates` until it is approved.
 */
@Entity('pay_adjustments')
@Check('pay_adjustments_amount_check', `(amount > (0)::numeric)`)
@Check(
  'pay_adjustments_direction_check',
  `((direction)::text = ANY ((ARRAY['increase'::character varying, 'decrease'::character varying])::text[]))`,
)
@Check(
  'pay_adjustments_kind_check',
  `((kind)::text = ANY ((ARRAY['percent'::character varying, 'amount'::character varying])::text[]))`,
)
@Check('pay_adjustments_rounding_check', `(rounding = ANY (ARRAY[0, 10, 50]))`)
@Check(
  'pay_adjustments_scope_check',
  `((scope)::text = ANY ((ARRAY['all'::character varying, 'role'::character varying, 'employees'::character varying])::text[]))`,
)
@Check(
  'pay_adjustments_status_check',
  `((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))`,
)
export class PayAdjustmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: 'pending', length: 10 })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'varchar', length: 10 })
  scope: 'all' | 'role' | 'employees';

  @Column({ type: 'varchar', nullable: true, length: 100 })
  role: string | null;

  @Column({ type: 'varchar', length: 8 })
  direction: 'increase' | 'decrease';

  @Column({ type: 'varchar', length: 7 })
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

  @Column({ name: 'requested_by', type: 'varchar', length: 100 })
  requestedBy: string;

  @Column({ name: 'requested_by_user_id', type: 'int', nullable: true })
  @ForeignKey(() => User, { name: 'pay_adjustments_requested_by_user_id_fkey' })
  requestedByUserId: number | null;

  @Column({ name: 'requested_at', type: 'timestamp', default: () => 'now()' })
  requestedAt: Date;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true, length: 100 })
  decidedBy: string | null;

  @Column({ name: 'decided_by_user_id', type: 'int', nullable: true })
  @ForeignKey(() => User, { name: 'pay_adjustments_decided_by_user_id_fkey' })
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
@Index('idx_pay_adjustment_lines_adjustment', ['adjustment'])
export class PayAdjustmentLineEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PayAdjustmentEntity, (a) => a.lines, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({
    name: 'adjustment_id',
    foreignKeyConstraintName: 'pay_adjustment_lines_adjustment_id_fkey',
  })
  adjustment: PayAdjustmentEntity;

  @Column({ name: 'employee_id', type: 'int' })
  @ForeignKey(() => EmployeeEntity, {
    name: 'pay_adjustment_lines_employee_id_fkey',
  })
  employeeId: number;

  @Column({ name: 'employee_name', type: 'varchar', length: 100 })
  employeeName: string;

  @Column({ type: 'varchar', length: 10 })
  category: 'factory' | 'office';

  @Column({ type: 'varchar', length: 100 })
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
