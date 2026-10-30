import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** DB-level roles stored on `users.role` (CHECK constraint `users_role_check`). */
export type DbRole =
  | 'estate_owner'
  | 'estate_manager'
  | 'plucking_employee'
  | 'collection_agent'
  | 'receiving_officer'
  | 'factory_admin'
  | 'factory_officer'
  | 'factory_manager';

/** Account states allowed on `users.status` (CHECK constraint `users_status_check`). */
export type UserStatus = 'active' | 'suspended';

/**
 * Maps `public.users`. The Neon `dev` schema (captured in
 * `src/migrations/baseline.sql`) is the source of truth: column types, lengths,
 * nullability, defaults and constraint names here mirror it exactly.
 *
 * TypeORM matches CHECK constraints by name and drops any it does not know, so
 * the `@Check` names must stay identical to the database's.
 */
@Entity('users')
@Check(
  'users_role_check',
  `"role" IN ('estate_owner', 'estate_manager', 'plucking_employee', 'collection_agent', 'receiving_officer', 'factory_admin', 'factory_officer', 'factory_manager')`,
)
@Check('users_status_check', `"status" IN ('active', 'suspended')`)
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  /** UNIQUE via `users_phone_key`. */
  @Column({ type: 'varchar', length: 15, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({ type: 'text' })
  password_hash: string;

  @Column({ type: 'varchar', length: 30 })
  role: DbRole;

  /** ADM-02 — a suspended account is rejected at login. */
  @Column({ default: 'active' })
  status: 'active' | 'suspended';

  /** A login provisioned by registration starts with a one-time temporary password; mobile blocks until it is changed. */
  @Column({ name: 'must_change_password', default: false })
  must_change_password: boolean;

  /** Stamped on each successful login; shown as "last login" in Users & Roles. */
  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  last_login_at: Date | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ type: 'timestamp', nullable: true })
  created_at: Date;

  /** Optional (most existing users have none); UNIQUE via `users_nic_unique`. */
  @Column({ type: 'varchar', length: 12, nullable: true, unique: true })
  nic: string | null;

  @Column({ type: 'boolean', default: false })
  must_change_password: boolean;
}
