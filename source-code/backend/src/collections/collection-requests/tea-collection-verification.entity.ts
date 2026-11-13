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

export type TeaCollectionVerificationStage = 'collection' | 'delivery';
export type TeaCollectionVerificationMethod = 'in_app' | 'qr';

@Entity('tea_collection_verifications')
@Index(
  'uq_assignment_verification_stage',
  ['assignmentId', 'verificationStage'],
  {
    unique: true,
  },
)
@Check(
  'chk_verification_stage',
  `"verification_stage" IN ('collection', 'delivery')`,
)
@Check('chk_verification_method', `"verification_method" IN ('in_app', 'qr')`)
@Check('chk_verified_weight', '"verified_weight_kg" > 0')
export class TeaCollectionVerificationEntity {
  @PrimaryGeneratedColumn('increment', {
    name: 'id',
    type: 'integer',
    primaryKeyConstraintName: 'tea_collection_verifications_pkey',
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
    foreignKeyConstraintName: 'fk_verifications_assignment',
  })
  assignment!: CollectionRequestAssignmentEntity;

  @Column({ name: 'verification_stage', type: 'varchar', length: 20 })
  verificationStage!: TeaCollectionVerificationStage;

  @Column({ name: 'verification_method', type: 'varchar', length: 20 })
  verificationMethod!: TeaCollectionVerificationMethod;

  @Column({ name: 'verified_by_user_id', type: 'integer' })
  verifiedByUserId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'verified_by_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_verifications_verified_by',
  })
  verifiedBy!: User;

  @Column({
    name: 'verified_weight_kg',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  verifiedWeightKg!: string;

  @Column({ name: 'verified_at', type: 'timestamptz', default: () => 'NOW()' })
  verifiedAt!: Date;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}


