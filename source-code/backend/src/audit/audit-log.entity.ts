import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * ADM-04 — one append-only row per mutation, written by `AuditService`. Never
 * updated or deleted (the trail loses integrity otherwise). `userId` is
 * nullable because some actors (e.g. system jobs) have no user row, and the
 * human-facing `userName`/`role` are always stamped regardless.
 */
@Entity('audit_logs')
export class AuditLogEntity {
  /** Business key, e.g. 'AUD-00001'. */
  @PrimaryColumn()
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'user_name' })
  userName: string;

  @Column()
  role: string;

  @Column()
  action: string;

  @Column()
  module: string;

  @Column({ type: 'varchar', nullable: true })
  record: string | null;

  @Column({ name: 'record_href', type: 'varchar', nullable: true })
  recordHref: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;
}
