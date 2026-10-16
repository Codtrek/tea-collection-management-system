import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { PublicRevisionLine } from './collection-map';

/**
 * One immutable revision of a delivery's grade lines. `delivery_grade_lines` stays the
 * CURRENT projection (so every existing reader keeps working); this table is the history.
 * Rows are only ever inserted — a correction adds a revision, it never rewrites one.
 */
@Entity('delivery_grade_revisions')
export class DeliveryGradeRevisionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id' })
  deliveryId: string;

  @Column({ name: 'revision_no', type: 'int' })
  revisionNo: number;

  @Column({ type: 'varchar' })
  kind: 'initial' | 'open_edit' | 'correction';

  @Column({ type: 'jsonb' })
  lines: PublicRevisionLine[];

  @Column({ name: 'total_kg', type: 'decimal', precision: 10, scale: 2 })
  totalKg: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'changed_by' })
  changedBy: string;

  @Column({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;
}
