import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DbEmployeeStatus, DbEmploymentType } from './employee-map';

/**
 * EMP-01..04. Separate from `factory_employees` (the auth/permission subtype
 * table for the 3 factory login roles) — this is the broader HR roster.
 * `userId` stays null for the majority (HR record only, no login). `hasLogin`
 * is a stored flag only in this slice: Employee self-service login is out of
 * scope for the admin portal (see Claude.md), so this module never
 * provisions a `users` row itself, unlike Estates' owner-registration flow.
 */
@Entity('employees')
export class EmployeeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column()
  name: string;

  @Column()
  nic: string;

  @Column({ type: 'date', nullable: true })
  dob: string | null;

  @Column({ type: 'varchar', nullable: true })
  contact: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  /** Free-text job title (e.g. 'Driver', 'Machine Operator') — not the factory_employees role enum. */
  @Column()
  role: string;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: string | null;

  @Column({ name: 'employment_type', type: 'varchar' })
  employmentType: DbEmploymentType;

  @Column({ type: 'varchar' })
  status: DbEmployeeStatus;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string | null;

  @Column({ name: 'bank_branch', type: 'varchar', nullable: true })
  bankBranch: string | null;

  @Column({ name: 'bank_account', type: 'varchar', nullable: true })
  bankAccount: string | null;

  @Column({ name: 'day_rate', type: 'decimal', precision: 8, scale: 2 })
  dayRate: string;

  @Column({ name: 'day_ot_rate', type: 'decimal', precision: 8, scale: 2 })
  dayOtRate: string;

  @Column({ name: 'night_rate', type: 'decimal', precision: 8, scale: 2 })
  nightRate: string;

  @Column({ name: 'night_ot_rate', type: 'decimal', precision: 8, scale: 2 })
  nightOtRate: string;

  @Column({ name: 'has_login', default: false })
  hasLogin: boolean;

  @Column({ name: 'last_updated_by', type: 'varchar', nullable: true })
  lastUpdatedBy: string | null;

  @Column({ name: 'last_updated_on', type: 'timestamp', nullable: true })
  lastUpdatedOn: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
