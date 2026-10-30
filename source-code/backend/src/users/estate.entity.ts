import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Route } from '../routes/route.entity';
import { EstateOwner } from './estate-owner.entity';

/** Values allowed on `estates.status` (CHECK constraint `estates_status_check`). */
export type EstateStatus = 'active' | 'inactive';

/**
 * Maps `public.estates`. The Neon `dev` schema (captured in
 * `src/migrations/baseline.sql`) is the source of truth: column types, lengths,
 * nullability, defaults and constraint names here mirror it exactly.
 *
 * TypeORM matches CHECK constraints, foreign keys and indexes by name and drops
 * any it does not know, so those names must stay identical to the database's.
 *
 * NUMERIC columns are typed `string`: the pg driver returns them as strings to
 * avoid losing precision. DATE columns are typed `string` (`YYYY-MM-DD`), which
 * is how TypeORM hydrates them.
 */
@Entity('estates')
@Check('estates_status_check', `"status" IN ('active', 'inactive')`)
@Index('idx_estates_owner', ['owner'])
export class Estate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'integer', nullable: true })
  @ForeignKey(() => Route, { name: 'estates_route_id_fkey' })
  route_id: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  route_name: string | null;

  @Column({ type: 'boolean', default: false })
  self_delivery: boolean;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: EstateStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  ytd_deliveries_kg: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_branch: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  bank_account: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_updated_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_updated_on: Date | null;

  /**
   * The DB stores this default as `('now'::text)::date`, the equivalent of
   * CURRENT_DATE that TypeORM can match. See the EstatesRegisteredOnDefault migration.
   */
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  registered_on: string;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ type: 'timestamp', nullable: true })
  created_at: Date;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lat: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lng: string | null;

  /** `owner_id` is NOT NULL in the DB. */
  @ManyToOne(() => EstateOwner, (owner) => owner.estate, { nullable: false })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'estates_owner_id_fkey',
  })
  owner: EstateOwner;
}
