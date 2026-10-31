import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CollectionRecordEntity } from './collection-record.entity';
import type { PublicRevisionLine } from './collection-map';

/**
 * One immutable revision of a delivery's grade lines. `delivery_grade_lines` stays the
 * CURRENT projection (so every existing reader keeps working); this table is the history.
 * Rows are only ever inserted — a correction adds a revision, it never rewrites one.
 */
@Entity('delivery_grade_revisions')
@Check(
  'delivery_grade_revisions_kind_check',
  `"kind" IN ('initial', 'open_edit', 'correction')`,
)
@Unique('delivery_grade_revisions_delivery_id_revision_no_key', [
  'deliveryId',
  'revisionNo',
])
@Index('idx_grade_revisions_delivery', ['deliveryId'])
export class DeliveryGradeRevisionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id', type: 'varchar', length: 20 })
  @ForeignKey(() => CollectionRecordEntity, {
    name: 'delivery_grade_revisions_delivery_id_fkey',
    onDelete: 'CASCADE',
  })
  deliveryId: string;

  @Column({ name: 'revision_no', type: 'int' })
  revisionNo: number;

  @Column({ type: 'varchar', length: 20 })
  kind: 'initial' | 'open_edit' | 'correction';

  @Column({ type: 'jsonb' })
  lines: PublicRevisionLine[];

  @Column({ name: 'total_kg', type: 'decimal', precision: 10, scale: 2 })
  totalKg: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'changed_by', type: 'varchar', length: 100 })
  changedBy: string;

  @Column({ name: 'changed_at', type: 'timestamptz', default: () => 'now()' })
  changedAt: Date;

  @Column({
    name: 'approved_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;
}
