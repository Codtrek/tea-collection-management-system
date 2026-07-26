import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DbAttendanceStatus } from './employee-map';

/** EMP-05..08 — one row per employee per day, upserted on re-marking. */
@Entity('employee_attendance')
export class EmployeeAttendanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar' })
  status: DbAttendanceStatus;

  @Column({
    name: 'day_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  dayHours: string;

  @Column({
    name: 'day_ot_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  dayOtHours: string;

  @Column({
    name: 'night_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  nightHours: string;

  @Column({
    name: 'night_ot_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  nightOtHours: string;

  @Column({ name: 'marked_by', type: 'varchar', nullable: true })
  markedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
