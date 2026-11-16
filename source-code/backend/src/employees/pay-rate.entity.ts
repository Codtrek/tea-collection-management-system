import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmployeeEntity } from './employee.entity';
import { PayAdjustmentEntity } from './pay-adjustment.entity';

/**
 * Pay history (Administration-Addendum §6) — one effective-dated set of the 4 hourly rates, for a
 * ROLE (the default) or one EMPLOYEE (an override). Inserted, never edited. An employee's pay on a
 * date is their override in force that day, else their role's rate (pay-resolution.ts).
 */
@Entity('pay_rates')
@Check(
  'pay_rates_check',
  `((((scope)::text = 'role'::text) AND (role IS NOT NULL) AND (employee_id IS NULL)) OR (((scope)::text = 'employee'::text) AND (employee_id IS NOT NULL)))`,
)
@Check('pay_rates_day_ot_rate_check', `(day_ot_rate >= (0)::numeric)`)
@Check('pay_rates_day_rate_check', `(day_rate >= (0)::numeric)`)
@Check('pay_rates_night_ot_rate_check', `(night_ot_rate >= (0)::numeric)`)
@Check('pay_rates_night_rate_check', `(night_rate >= (0)::numeric)`)
@Check(
  'pay_rates_scope_check',
  `((scope)::text = ANY ((ARRAY['role'::character varying, 'employee'::character varying])::text[]))`,
)
@Check(
  'pay_rates_source_check',
  `((source)::text = ANY ((ARRAY['migration'::character varying, 'registration'::character varying, 'adjustment'::character varying])::text[]))`,
)
@Index('pay_rates_employee_date_key', ['employeeId', 'effectiveDate'], {
  unique: true,
  where: `((scope)::text = 'employee'::text)`,
})
@Index('pay_rates_role_date_key', ['role', 'effectiveDate'], {
  unique: true,
  where: `((scope)::text = 'role'::text)`,
})
export class PayRateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 8 })
  scope: 'role' | 'employee';

  @Column({ type: 'varchar', nullable: true, length: 100 })
  role: string | null;

  @Column({ name: 'employee_id', type: 'int', nullable: true })
  @ForeignKey(() => EmployeeEntity, { name: 'pay_rates_employee_id_fkey' })
  employeeId: number | null;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'day_rate', type: 'decimal', precision: 8, scale: 2 })
  dayRate: string;

  @Column({ name: 'day_ot_rate', type: 'decimal', precision: 8, scale: 2 })
  dayOtRate: string;

  @Column({ name: 'night_rate', type: 'decimal', precision: 8, scale: 2 })
  nightRate: string;

  @Column({ name: 'night_ot_rate', type: 'decimal', precision: 8, scale: 2 })
  nightOtRate: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'set_by', type: 'varchar', length: 100 })
  setBy: string;

  @Column({ type: 'varchar', length: 12 })
  source: 'migration' | 'registration' | 'adjustment';

  @Column({ name: 'adjustment_id', type: 'int', nullable: true })
  @ForeignKey(() => PayAdjustmentEntity, { name: 'pay_rates_adjustment_fk' })
  adjustmentId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
