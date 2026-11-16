import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  OneToMany,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { CollectionAgentEntity } from '../dispatch/collection-agent.entity';
import { EstateEntity } from '../estates/estate.entity';
import { RouteEntity } from '../estates/route.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import type { DbStatus, EvidencePhoto, TimelineEntry } from './collection-map';
import { DeliveryGradeLineEntity } from './delivery-grade-line.entity';

@Entity('tea_collection_records')
@Check(
  'tea_collection_records_status_check',
  `"status" IN ('submitted', 'approved', 'agent_assigned', 'collected', 'confirmed', 'pending_agent_confirmation')`,
)
@Index('idx_collection_records_estate', ['estateId'])
@Index('idx_collection_records_settlement', ['settlementId'])
@Index('idx_collection_records_status', ['status'])
export class CollectionRecordEntity {
  /** Business key, e.g. 'GV-2026-0714' — not a generated id. */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'estate_id', type: 'int', nullable: true })
  @ForeignKey(() => EstateEntity, {
    name: 'tea_collection_records_estate_id_fkey',
  })
  estateId: number | null;

  /** Opaque estate label from the still-fixture-based Estates module (e.g. 'EST-0001'). */
  @Column({ name: 'estate_ref', type: 'varchar', length: 20, nullable: true })
  estateRef: string | null;

  @Column({ name: 'estate_name', type: 'varchar', length: 100 })
  estateName: string;

  @Column({ name: 'route_id', type: 'int', nullable: true })
  @ForeignKey(() => RouteEntity, {
    name: 'tea_collection_records_route_id_fkey',
  })
  routeId: number | null;

  @Column({ name: 'route_name', type: 'varchar', length: 100 })
  routeName: string;

  /**
   * ESTATE weight: what the agent weighed at the estate (owner-confirmed on the agent's
   * device). Never overwritten by grading — it is the mismatch-check input. The graded
   * total lives in `gradeLines` (see `weightSummary` in collection-map.ts).
   */
  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 2 })
  weightKg: string;

  /** Factory-assigned grade lines. Eager so every existing `find` returns them. Empty = Ungraded. */
  @OneToMany(() => DeliveryGradeLineEntity, (l) => l.delivery, {
    eager: true,
    cascade: true,
  })
  gradeLines: Relation<DeliveryGradeLineEntity[]>;

  @Column({ type: 'varchar', length: 30, default: 'submitted' })
  status: DbStatus;

  @Column({ name: 'collection_date', type: 'date' })
  collectionDate: string;

  @Column({ name: 'agent_id', type: 'int', nullable: true })
  @ForeignKey(() => CollectionAgentEntity, {
    name: 'tea_collection_records_agent_id_fkey',
  })
  agentId: number | null;

  @Column({
    name: 'agent_name',
    type: 'varchar',
    length: 100,
    default: 'Self-delivered',
  })
  agentName: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  photos: EvidencePhoto[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  timeline: TimelineEntry[];

  @Column({ type: 'jsonb', nullable: true })
  provisional: { reportedBy: string; reason: string } | null;

  @Column({ type: 'jsonb', nullable: true })
  mismatch: { complaintId: string; note: string } | null;

  @Column({
    name: 'last_updated_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lastUpdatedBy: string | null;

  @Column({ name: 'last_updated_on', type: 'timestamp', nullable: true })
  lastUpdatedOn: Date | null;

  /** When the factory first saved the grading. */
  @Column({ name: 'graded_at', type: 'timestamptz', nullable: true })
  gradedAt: Date | null;

  /**
   * End of the OPEN window — graded_at + the correction window AS IT WAS WHEN GRADED
   * (a snapshot, never recomputed from the current setting). Null on a confirmed row =
   * legacy = locked. See `gradingState` in collection-map.ts.
   */
  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt: Date | null;

  /** Set when an officer clicks Finalize; locked_at is pulled forward to it. */
  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt: Date | null;

  /** The processed settlement that paid this delivery (set at process time). */
  @Column({
    name: 'settlement_id',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  @ForeignKey(() => SettlementEntity, {
    name: 'tea_collection_records_settlement_id_fkey',
  })
  settlementId: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
