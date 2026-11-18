import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmployeeEntity } from '../employees/employee.entity';

/** A per-employee rest day (7-day factories) overriding the category's weekly holiday, from `effectiveFrom`. */
@Entity('employee_rest_days')
@Check(
  'employee_rest_days_weekday_check',
  `((weekday >= 0) AND (weekday <= 6))`,
)
@Index('idx_employee_rest_days_employee', ['employeeId'])
export class EmployeeRestDayEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  @ForeignKey(() => EmployeeEntity, {
    name: 'employee_rest_days_employee_id_fkey',
  })
  employeeId: number;

  /** null = back to the category's weekly holiday */
  @Column({ type: 'int', nullable: true })
  weekday: number | null;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'created_by', type: 'varchar', nullable: true, length: 100 })
  createdBy: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;
}
