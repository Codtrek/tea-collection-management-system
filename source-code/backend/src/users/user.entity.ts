import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** DB-level roles stored on `users.role` (init.sql CHECK constraint). */
export type DbRole =
  | 'estate_owner'
  | 'estate_manager'
  | 'plucking_employee'
  | 'collection_agent'
  | 'receiving_officer'
  | 'factory_admin'
  | 'factory_officer'
  | 'factory_manager';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  phone: string;

  @Column()
  password_hash: string;

  @Column()
  role: DbRole;

  /** ADM-02 — a suspended account is rejected at login. */
  @Column({ default: 'active' })
  status: 'active' | 'suspended';

  /** Stamped on each successful login; shown as "last login" in Users & Roles. */
  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  last_login_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
