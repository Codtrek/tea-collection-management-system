import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
export class RouteAssignmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'route_id' })
  routeId: number;

  @Column({ name: 'agent_id' })
  agentId: number;

  @Column({ type: 'varchar' })
  type: AssignmentType;

  @Column({ type: 'varchar' })
  status: AssignmentStatus;

  /** 'YYYY-MM-DD' */
  @Column({ name: 'valid_from', type: 'date' })
  validFrom: string;

  /** null = open-ended (a live permanent assignment). */
  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: string | null;

  @Column({ name: 'created_by' })
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
  coversAssignmentId: number | null;

  /** Hook for splitting a route between agents later (stop-level overrides). Unused. */
  @Column({ name: 'stop_scope', type: 'jsonb', nullable: true })
  stopScope: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
