import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CollectionRecordEntity } from './collection-record.entity';
import type { PublicRevisionLine } from './collection-map';

/** A request to change the grade lines of a LOCKED or SETTLED delivery. One pending per delivery. */
@Entity('grade_correction_requests')
@Check(
  'grade_correction_requests_status_check',
  `"status" IN ('pending', 'approved', 'rejected')`,
)
@Index('uq_correction_one_pending', ['deliveryId'], {
  unique: true,
  where: `"status" = 'pending'`,
})
export class GradeCorrectionRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id', type: 'varchar', length: 20 })
  @ForeignKey(() => CollectionRecordEntity, {
    name: 'grade_correction_requests_delivery_id_fkey',
    onDelete: 'CASCADE',
  })
  deliveryId: string;

  @Column({ type: 'jsonb' })
  lines: PublicRevisionLine[];

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ name: 'requested_by', type: 'varchar', length: 100 })
  requestedBy: string;

  @Column({
    name: 'requested_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  requestedAt: Date;

  @Column({
    name: 'decided_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote: string | null;
}
