import {
  Check,
  Column,
  Entity,
  ForeignKey,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Factory } from './factory.entity';
import { User } from './user.entity';

/** Roles allowed on `factory_employees.role` (CHECK constraint `factory_employees_role_check`). */
export type FactoryEmployeeRole =
  | 'collection_agent'
  | 'receiving_officer'
  | 'factory_admin'
  | 'factory_officer'
  | 'factory_manager';

/**
 * Profile row for factory-side users (Administrator/Officer/Manager in the portal).
 * Read-only here — full CRUD lands with the Employees module slice.
 *
 * Maps `public.factory_employees`. The Neon `dev` schema (captured in
 * `src/migrations/baseline.sql`) is the source of truth: column types, lengths,
 * nullability, defaults and constraint names here mirror it exactly. TypeORM
 * matches CHECK constraints and foreign keys by name and drops any it does not
 * know, so those names must stay identical to the database's.
 */
@Entity('factory_employees')
@Check(
  'factory_employees_role_check',
  `"role" IN ('collection_agent', 'receiving_officer', 'factory_admin', 'factory_officer', 'factory_manager')`,
)
export class FactoryEmployee {
  @PrimaryGeneratedColumn()
  id: number;

  /** One employee profile per user: UNIQUE via `factory_employees_user_id_key`. */
  @Column({ type: 'integer', unique: true })
  @ForeignKey(() => User, { name: 'factory_employees_user_id_fkey' })
  user_id: number;

  @Column({ type: 'integer' })
  factory_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** DATE: TypeORM hydrates it as a `YYYY-MM-DD` string. */
  @Column({ type: 'date', nullable: true })
  date_of_birth: string | null;

  /** UNIQUE via `factory_employees_nic_key`. */
  @Column({ type: 'varchar', length: 20, unique: true })
  nic: string;

  @Column({ type: 'varchar', length: 30 })
  role: FactoryEmployeeRole;

  @Column({ type: 'boolean', nullable: true, default: true })
  is_active: boolean | null;

  @ManyToOne(() => Factory)
  @JoinColumn({
    name: 'factory_id',
    foreignKeyConstraintName: 'factory_employees_factory_id_fkey',
  })
  factory: Factory;
}
