import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/user.entity';
import { CollectionRequestAssignmentEntity } from './tea-collection-request-assignment.entity';

export type TeaCollectionDiscrepancyStatus =
  | 'open'
  | 'under_review'
  | 'resolved';

@Entity('tea_collection_discrepancies')
@Index('uq_discrepancy_assignment', ['assignmentId'], { unique: true })
// The migration specifies reported_at DESC for this index.
@Index('idx_discrepancies_status_reported', { synchronize: false })
@Check(
  'chk_discrepancy_status',
  `"status" IN ('open', 'under_review', 'resolved')`,
)
@Check(
  'chk_discrepancy_resolution',
  `(
    "status" = 'resolved'
    AND "resolved_by_user_id" IS NOT NULL
    AND "resolved_at" IS NOT NULL
    AND NULLIF(TRIM("resolution_notes"), '') IS NOT NULL
  ) OR (
    "status" <> 'resolved'
    AND "resolved_by_user_id" IS NULL
    AND "resolved_at" IS NULL
  )`,
)
export class TeaCollectionDiscrepancyEntity {
  @PrimaryGeneratedColumn('increment', {
    name: 'id',
    type: 'integer',
    primaryKeyConstraintName: 'tea_collection_discrepancies_pkey',
  })
  id!: number;

  @Column({ name: 'assignment_id', type: 'integer' })
  assignmentId!: number;

  // The named unique index permits only one discrepancy per assignment.
  @ManyToOne(() => CollectionRequestAssignmentEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'assignment_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_discrepancies_assignment',
  })
  assignment!: CollectionRequestAssignmentEntity;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'open' })
  status!: TeaCollectionDiscrepancyStatus;

  @Column({ name: 'reported_at', type: 'timestamptz', default: () => 'NOW()' })
  reportedAt!: Date;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ name: 'resolved_by_user_id', type: 'integer', nullable: true })
  resolvedByUserId!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'resolved_by_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_discrepancies_resolved_by',
  })
  resolvedBy!: User | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;
}
