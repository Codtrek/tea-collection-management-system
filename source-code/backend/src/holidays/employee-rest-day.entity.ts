import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A per-employee rest day (7-day factories) overriding the category's weekly holiday, from `effectiveFrom`. */
@Entity('employee_rest_days')
export class EmployeeRestDayEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  /** null = back to the category's weekly holiday */
  @Column({ type: 'int', nullable: true })
  weekday: number | null;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
