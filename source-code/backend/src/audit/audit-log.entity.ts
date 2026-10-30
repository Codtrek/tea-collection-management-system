import {
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * ADM-04 — one append-only row per mutation, written by `AuditService`. Never
 * updated or deleted (the trail loses integrity otherwise). `userId` is
 * nullable because some actors (e.g. system jobs) have no user row, and the
 * human-facing `userName`/`role` are always stamped regardless.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_created', ['createdAt'])
@Index('idx_audit_logs_module', ['module'])
@Index('idx_audit_logs_user', ['userName'])
export class AuditLogEntity {
  /** Business key, e.g. 'AUD-00001'. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  @ForeignKey(() => User, { name: 'audit_logs_user_id_fkey' })
  userId: number | null;

  @Column({ name: 'user_name', type: 'varchar', length: 100 })
  userName: string;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'varchar', length: 200 })
  action: string;

  @Column({ type: 'varchar', length: 40 })
  module: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  record: string | null;

  @Column({ name: 'record_href', type: 'varchar', length: 200, nullable: true })
  recordHref: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;
}
