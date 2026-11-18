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

export type TeaCollectionEvidenceType =
  | 'agent_collection_photo'
  | 'manager_collection_photo'
  | 'delivery_photo';

@Entity('tea_collection_evidence')
@Index('idx_evidence_assignment', ['assignmentId'])
@Index('idx_evidence_uploaded_by', ['uploadedByUserId'])
@Check(
  'chk_evidence_type',
  `"evidence_type" IN ('agent_collection_photo', 'manager_collection_photo', 'delivery_photo')`,
)
@Check('chk_evidence_file_path', 'LENGTH(TRIM("file_path")) > 0')
export class TeaCollectionEvidenceEntity {
  @PrimaryGeneratedColumn('increment', {
    name: 'id',
    type: 'integer',
    primaryKeyConstraintName: 'tea_collection_evidence_pkey',
  })
  id!: number;

  @Column({ name: 'assignment_id', type: 'integer' })
  assignmentId!: number;

  @ManyToOne(() => CollectionRequestAssignmentEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'assignment_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_evidence_assignment',
  })
  assignment!: CollectionRequestAssignmentEntity;

  @Column({ name: 'uploaded_by_user_id', type: 'integer' })
  uploadedByUserId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'uploaded_by_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_evidence_uploaded_by',
  })
  uploadedBy!: User;

  @Column({ name: 'evidence_type', type: 'varchar', length: 40 })
  evidenceType!: TeaCollectionEvidenceType;

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
