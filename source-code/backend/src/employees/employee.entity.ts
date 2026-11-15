import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
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
@Check(
  'employees_employment_type_check',
  `"employment_type" IN ('Permanent', 'Contract', 'Casual')`,
)
@Check(
  'employees_status_check',
  `"status" IN ('Active', 'Suspended', 'Inactive')`,
)
export class EmployeeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** UNIQUE via `employees_user_id_key`. */
  @Column({ name: 'user_id', type: 'int', nullable: true, unique: true })
  @ForeignKey(() => User, { name: 'employees_user_id_fkey' })
  userId: number | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** UNIQUE via `employees_nic_key`. */
  @Column({ type: 'varchar', length: 20, unique: true })
  nic: string;

  @Column({ type: 'date', nullable: true })
  dob: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contact: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  /** Free-text job title (e.g. 'Driver', 'Machine Operator') — not the factory_employees role enum. */
  @Column({ type: 'varchar', length: 50 })
  role: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  department: string | null;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: string | null;

  @Column({
    name: 'employment_type',
    type: 'varchar',
    length: 20,
    default: 'Permanent',
  })
  employmentType: DbEmploymentType;

  @Column({ type: 'varchar', length: 20, default: 'Active' })
  status: DbEmployeeStatus;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName: string | null;

  @Column({ name: 'bank_branch', type: 'varchar', length: 100, nullable: true })
  bankBranch: string | null;

  @Column({ name: 'bank_account', type: 'varchar', length: 50, nullable: true })
  bankAccount: string | null;

  @Column({
    name: 'day_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  dayRate: string;

  @Column({
    name: 'day_ot_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  dayOtRate: string;

  @Column({
    name: 'night_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  nightRate: string;

  @Column({
    name: 'night_ot_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  nightOtRate: string;

  @Column({ name: 'has_login', default: false })
  hasLogin: boolean;

  @Column({
    name: 'last_updated_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lastUpdatedBy: string | null;

  @Column({ name: 'last_updated_on', type: 'timestamp', nullable: true })
  lastUpdatedOn: Date | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
