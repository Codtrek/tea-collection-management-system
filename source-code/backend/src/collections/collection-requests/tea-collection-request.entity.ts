
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
  UpdateDateColumn,
} from 'typeorm';

import { EstateEntity } from '../../estates/estate.entity';
import { User } from '../../users/user.entity';
import { CollectionRequestAssignmentEntity } from './tea-collection-request-assignment.entity';

export type CollectionRequestStatus =
  | 'open'
  | 'accepted'
  | 'collected'
  | 'delivered'
  | 'cancelled';

@Entity('tea_collection_requests')

// Indexes created by our migration
@Index('idx_collection_requests_estate_created', {
  synchronize: false,
})
@Index('idx_collection_requests_status_created', {
  synchronize: false,
})
@Index(
  'idx_collection_requests_requested_by',
  ['requestedByUserId'],
)

// Request status constraint
@Check(
  'chk_collection_requests_status',
  `"status" IN (
    'open',
    'accepted',
    'collected',
    'delivered',
    'cancelled'
  )`,
)

// Cancellation timestamp constraint
@Check(
  'chk_collection_requests_cancelled_at',
  `("status" = 'cancelled') =
   ("cancelled_at" IS NOT NULL)`,
)

export class CollectionRequestEntity {

  @PrimaryGeneratedColumn('increment', {
    type: 'integer',
    name: 'id',
  })
  id!: number;

  // Estate relationship
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
    foreignKeyConstraintName:
      'fk_collection_requests_estate',
  })
  estate!: EstateEntity;

  // Request creator: estate owner or manager
  @Column({
    name: 'requested_by_user_id',
    type: 'integer',
  })
  requestedByUserId!: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'requested_by_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName:
      'fk_collection_requests_requested_by',
  })
  requestedBy!: User;

  // Optional request notes
  @Column({
    name: 'notes',
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

  // Request lifecycle
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'open',
  })
  status!: CollectionRequestStatus;

  // Timestamps
  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  createdAt!: Date;

  @UpdateDateColumn({
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

  // Agent assignment relationship
  @OneToMany(
    () => CollectionRequestAssignmentEntity,
    (assignment) => assignment.request,
  )
  assignments!: CollectionRequestAssignmentEntity[];
}
