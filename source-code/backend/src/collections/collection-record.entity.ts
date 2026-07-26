import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type {
  DbGrade,
  DbStatus,
  EvidencePhoto,
  TimelineEntry,
} from './collection-map';

@Entity('tea_collection_records')
export class CollectionRecordEntity {
  /** Business key, e.g. 'GV-2026-0714' — not a generated id. */
  @PrimaryColumn()
  id: string;

  @Column({ name: 'estate_id', type: 'int', nullable: true })
  estateId: number | null;

  /** Opaque estate label from the still-fixture-based Estates module (e.g. 'EST-0001'). */
  @Column({ name: 'estate_ref', type: 'varchar', nullable: true })
  estateRef: string | null;

  @Column({ name: 'estate_name' })
  estateName: string;

  @Column({ name: 'route_id', type: 'int', nullable: true })
  routeId: number | null;

  @Column({ name: 'route_name' })
  routeName: string;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 2 })
  weightKg: string;

  @Column({ type: 'varchar' })
  grade: DbGrade;

  @Column({ type: 'varchar' })
  status: DbStatus;

  @Column({ name: 'collection_date', type: 'date' })
  collectionDate: string;

  @Column({ name: 'agent_id', type: 'int', nullable: true })
  agentId: number | null;

  @Column({ name: 'agent_name' })
  agentName: string;

  @Column({ type: 'jsonb' })
  photos: EvidencePhoto[];

  @Column({ type: 'jsonb' })
  timeline: TimelineEntry[];

  @Column({ type: 'jsonb', nullable: true })
  provisional: { reportedBy: string; reason: string } | null;

  @Column({ type: 'jsonb', nullable: true })
  mismatch: { complaintId: string; note: string } | null;

  @Column({ name: 'last_updated_by', type: 'varchar', nullable: true })
  lastUpdatedBy: string | null;

  @Column({ name: 'last_updated_on', type: 'timestamp', nullable: true })
  lastUpdatedOn: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
