import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';

import { CollectionRequestEntity } from './col-request.entity';
import { CollectionAgentEntity } from '../../dispatch/collection-agent.entity';
import { User } from '../../users/user.entity';

export type CollectionRequestAssignmentStatus =
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed';

@Entity('tea_collection_request_assignments')

@Index('idx_request_assignments_request_status', ['requestId', 'status'])
@Index('idx_request_assignments_agent_status', ['agentId', 'status'])

@Index(
  'uq_request_one_open_assignment',
  ['requestId'],
  {
    unique: true,
    where: `"status" IN ('offered', 'accepted')`,
  },
)

@Check(
  'chk_request_assignments_status',
  `"status" IN ('offered', 'accepted', 'declined', 'cancelled', 'completed')`,
)
export class CollectionRequestAssignmentEntity {
  @PrimaryGeneratedColumn('increment', {
    type: 'integer',
    name: 'id',
  })
  id!: number;

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

  @Column({
    name: 'assigned_by_user_id',
    type: 'integer',
    nullable: true,
  })
  assignedByUserId!: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'assigned_by_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_request_assignments_assigned_by',
  })
  assignedBy!: User | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'offered',
  })
  status!: CollectionRequestAssignmentStatus;

  @Column({
    name: 'offered_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  offeredAt!: Date;

  @Column({
    name: 'responded_at',
    type: 'timestamptz',
    nullable: true,
  })
  respondedAt!: Date | null;

  @Column({
    name: 'response_reason',
    type: 'text',
    nullable: true,
  })
  responseReason!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  createdAt!: Date;
}