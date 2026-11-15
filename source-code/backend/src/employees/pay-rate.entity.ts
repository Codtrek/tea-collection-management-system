import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Pay history (Administration-Addendum §6) — one effective-dated set of the 4 hourly rates, for a
 * ROLE (the default) or one EMPLOYEE (an override). Inserted, never edited. An employee's pay on a
 * date is their override in force that day, else their role's rate (pay-resolution.ts).
 */
@Entity('pay_rates')
export class PayRateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  scope: 'role' | 'employee';

  @Column({ type: 'varchar', nullable: true })
  role: string | null;

  @Column({ name: 'employee_id', type: 'int', nullable: true })
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

  @Column({ name: 'set_by', type: 'varchar' })
  setBy: string;

  @Column({ type: 'varchar' })
  source: 'migration' | 'registration' | 'adjustment';

  @Column({ name: 'adjustment_id', type: 'int', nullable: true })
  adjustmentId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
