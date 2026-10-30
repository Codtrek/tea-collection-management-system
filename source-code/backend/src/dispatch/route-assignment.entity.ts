import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RouteEntity } from '../estates/route.entity';
import { CollectionAgentEntity } from './collection-agent.entity';

export type AssignmentType = 'PERMANENT' | 'COVER';
export type AssignmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELLED';

/**
 * Who is responsible for a route, and when. Requests are addressed to the ROUTE; the
 * resolver (`RouteResolverService.getAgentForRoute`) finds the agent for a date from
 * these rows, so reassigning or covering only ever changes assignment rows.
 */
@Entity('route_assignments')
@Check(
  'route_assignments_check',
  `"valid_to" IS NULL OR "valid_to" >= "valid_from"`,
)
@Check(
  'route_assignments_status_check',
  `"status" IN ('PENDING', 'ACTIVE', 'DECLINED', 'EXPIRED', 'CANCELLED')`,
)
@Check('route_assignments_type_check', `"type" IN ('PERMANENT', 'COVER')`)
@Index('idx_route_assignments_agent', ['agentId', 'status'])
@Index('idx_route_assignments_route', ['routeId', 'validFrom'])
@Index('uq_route_one_open_permanent', ['routeId'], {
  unique: true,
  where: `"type" = 'PERMANENT' AND "status" = 'ACTIVE' AND "valid_to" IS NULL`,
})
export class RouteAssignmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'route_id', type: 'int' })
  @ForeignKey(() => RouteEntity, { name: 'route_assignments_route_id_fkey' })
  routeId: number;

  @Column({ name: 'agent_id', type: 'int' })
  @ForeignKey(() => CollectionAgentEntity, {
    name: 'route_assignments_agent_id_fkey',
  })
  agentId: number;

  @Column({ type: 'varchar', length: 10 })
  type: AssignmentType;

  @Column({ type: 'varchar', length: 10, default: 'PENDING' })
  status: AssignmentStatus;

  /** 'YYYY-MM-DD' */
  @Column({ name: 'valid_from', type: 'date' })
  validFrom: string;

  /** null = open-ended (a live permanent assignment). */
  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy: string;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  /** A PENDING cover lapses (→ EXPIRED) once this passes. */
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'covers_assignment_id', type: 'int', nullable: true })
  @ForeignKey(() => RouteAssignmentEntity, {
    name: 'route_assignments_covers_assignment_id_fkey',
  })
  coversAssignmentId: number | null;

  /** Hook for splitting a route between agents later (stop-level overrides). Unused. */
  @Column({ name: 'stop_scope', type: 'jsonb', nullable: true })
  stopScope: unknown;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
