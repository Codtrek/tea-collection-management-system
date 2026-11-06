import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';

import { EstateEntity } from '../../estates/estate.entity';
import { User } from '../../users/user.entity';
import { CollectionRequestAssignmentEntity } from './col-request-assignment.entity';

export type CollectionRequestSource =
  | 'estate_submitted'
  | 'factory_created_on_behalf';

export type CollectionRequestStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'cancelled'
  | 'collected'
  | 'delivered';

@Entity('tea_collection_requests')

@Index('idx_collection_requests_estate_status', ['estateId', 'status'])
@Index('idx_collection_requests_status_date', ['status', 'requestedCollectionDate'])
@Index('idx_collection_requests_created_by', ['createdByUserId'])

@Check(
  'chk_collection_requests_source',
  `"source" IN ('estate_submitted', 'factory_created_on_behalf')`,
)
@Check(
  'chk_collection_requests_weight',
  '"requested_weight_kg" > 0',
)
@Check(
  'chk_collection_requests_status',
  `"status" IN ('pending', 'assigned', 'accepted', 'cancelled', 'collected', 'delivered')`,
)
export class CollectionRequestEntity {
  @PrimaryGeneratedColumn('increment', {
    type: 'integer',
    name: 'id',
  })
  id!: number;

  @Column({
    name: 'estate_id',
    type: 'integer',
  })
  estateId!: number;

  @ManyToOne(() => EstateEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'estate_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_collection_requests_estate',
  })
  estate!: EstateEntity;

  @Column({
    name: 'requested_by_user_id',
    type: 'integer',
    nullable: true,
  })
  requestedByUserId!: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'requested_by_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_collection_requests_requested_by',
  })
  requestedBy!: User | null;

  @Column({
    name: 'created_by_user_id',
    type: 'integer',
  })
  createdByUserId!: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'created_by_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_collection_requests_created_by',
  })
  createdBy!: User;

  @Column({
    name: 'source',
    type: 'varchar',
    length: 40,
  })
  source!: CollectionRequestSource;

  @Column({
    name: 'requested_weight_kg',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  requestedWeightKg!: string;

  @Column({
    name: 'requested_collection_date',
    type: 'date',
  })
  requestedCollectionDate!: string;

  @Column({
    name: 'notes',
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: CollectionRequestStatus;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  createdAt!: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  updatedAt!: Date;

  @Column({
    name: 'cancelled_at',
    type: 'timestamptz',
    nullable: true,
  })
  cancelledAt!: Date | null;

  @OneToMany(
    () => CollectionRequestAssignmentEntity,
    (assignment) => assignment.request,
  )
  assignments!: CollectionRequestAssignmentEntity[];
}