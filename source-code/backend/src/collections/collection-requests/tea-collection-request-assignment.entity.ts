
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
  UpdateDateColumn,
} from 'typeorm';

import { CollectionRequestEntity } from './tea-collection-request.entity';
import { CollectionAgentEntity } from '../../dispatch/collection-agent.entity';

export type CollectionRequestAssignmentStatus =
  | 'accepted'
  | 'collected'
  | 'delivered'
  | 'cancelled';

@Entity('tea_collection_request_assignments')

@Index(
  'idx_request_assignments_request_status',
  ['requestId', 'status'],
)
@Index(
  'idx_request_assignments_agent_status',
  ['agentId', 'status'],
)

@Index('uq_request_active_assignment', ['requestId'], {
  unique: true,
  where: `"status" IN ('accepted', 'collected', 'delivered')`,
})

@Check(
  'chk_request_assignments_status',
  `"status" IN ('accepted', 'collected', 'delivered', 'cancelled')`,
)

@Check(
  'chk_assignment_collected_weight',
  `"collected_weight_kg" IS NULL OR "collected_weight_kg" > 0`,
)

@Check(
  'chk_assignment_received_weight',
  `"received_weight_kg" IS NULL OR "received_weight_kg" > 0`,
)

@Check(
  'chk_assignment_collected_data',
  `"status" NOT IN ('collected', 'delivered')
   OR (
     "collected_at" IS NOT NULL
     AND "collected_weight_kg" IS NOT NULL
   )`,
)

@Check(
  'chk_assignment_delivered_data',
  `"status" <> 'delivered'
   OR (
     "delivered_at" IS NOT NULL
     AND "received_weight_kg" IS NOT NULL
   )`,
)

@Check(
  'chk_assignment_cancelled_data',
  `("status" = 'cancelled') = ("cancelled_at" IS NOT NULL)`,
)

export class CollectionRequestAssignmentEntity {

  @PrimaryGeneratedColumn('increment', {
    type: 'integer',
    name: 'id',
  })
  id!: number;

  // Collection request relationship
  @Column({
    name: 'request_id',
    type: 'integer',
  })
  requestId!: number;

  @ManyToOne(
    () => CollectionRequestEntity,
    (request) => request.assignments,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'request_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_request_assignments_request',
  })
  request!: CollectionRequestEntity;

  // Collection agent relationship
  @Column({
    name: 'agent_id',
    type: 'integer',
  })
  agentId!: number;

  @ManyToOne(() => CollectionAgentEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'agent_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_request_assignments_agent',
  })
  agent!: CollectionAgentEntity;

  // Assignment status
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'accepted',
  })
  status!: CollectionRequestAssignmentStatus;

  // Acceptance timestamp
  @Column({
    name: 'accepted_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  acceptedAt!: Date;

  // Collection information
  @Column({
    name: 'collected_at',
    type: 'timestamptz',
    nullable: true,
  })
  collectedAt!: Date | null;

  @Column({
    name: 'collected_weight_kg',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  collectedWeightKg!: string | null;

  // Delivery information
  @Column({
    name: 'delivered_at',
    type: 'timestamptz',
    nullable: true,
  })
  deliveredAt!: Date | null;

  @Column({
    name: 'received_weight_kg',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  receivedWeightKg!: string | null;

  // Cancellation information
  @Column({
    name: 'cancelled_at',
    type: 'timestamptz',
    nullable: true,
  })
  cancelledAt!: Date | null;

  @Column({
    name: 'cancellation_reason',
    type: 'text',
    nullable: true,
  })
  cancellationReason!: string | null;

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
}
