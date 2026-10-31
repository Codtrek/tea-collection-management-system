import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateOwnerEntity } from './estate-owner.entity';
import type { DbEstateStatus } from './estate-map';
import { RouteEntity } from './route.entity';

/**
 * EST-01..04, EST-09. Route is system-assigned and never edited after registration.
 *
 * The only mapping of `public.estates`. The Neon `dev` schema (captured in
 * `src/migrations/baseline.sql`) is the source of truth: types, lengths,
 * defaults and constraint names mirror it exactly, because TypeORM matches
 * CHECKs, FKs and indexes by name and drops any it does not know.
 */
@Entity('estates')
@Check('estates_status_check', `"status" IN ('active', 'inactive')`)
@Index('idx_estates_owner', ['ownerId'])
export class EstateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_id', type: 'integer' })
  @ForeignKey(() => EstateOwnerEntity, { name: 'estates_owner_id_fkey' })
  ownerId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'route_id', type: 'integer', nullable: true })
  @ForeignKey(() => RouteEntity, { name: 'estates_route_id_fkey' })
  routeId: number | null;

  @Column({ name: 'route_name', type: 'varchar', length: 100, nullable: true })
  routeName: string | null;

  @Column({ name: 'self_delivery', type: 'boolean', default: false })
  selfDelivery: boolean;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: DbEstateStatus;

  @Column({
    name: 'ytd_deliveries_kg',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  ytdDeliveriesKg: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName: string | null;

  @Column({ name: 'bank_branch', type: 'varchar', length: 100, nullable: true })
  bankBranch: string | null;

  @Column({ name: 'bank_account', type: 'varchar', length: 30, nullable: true })
  bankAccount: string | null;

  @Column({
    name: 'last_updated_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lastUpdatedBy: string | null;

  @Column({ name: 'last_updated_on', type: 'timestamp', nullable: true })
  lastUpdatedOn: Date | null;

  /**
   * Added 2026-07-28 (Estate Owner Lifetime History slice) — the tenure
   * anchor for EST-03's "Member since" / EST-10's Tenure Ribbon origin.
   * Distinct from `createdAt` (a row-insert timestamp, always ~seed time for
   * every seeded estate) so backfilled multi-year history is honest.
   *
   * The DB stores this default as `('now'::text)::date`, the equivalent of
   * CURRENT_DATE that TypeORM can match. See the EstatesRegisteredOnDefault migration.
   */
  @Column({
    name: 'registered_on',
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  registeredOn: string;

  /** Agent Dispatch map pin — nullable; estates without coordinates are skipped on the map. */
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lat: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lng: string | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date;
}
