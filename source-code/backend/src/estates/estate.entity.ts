import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DbEstateStatus } from './estate-map';

/** EST-01..04, EST-09. Route is system-assigned and never edited after registration. */
@Entity('estates')
export class EstateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'route_id', type: 'int', nullable: true })
  routeId: number | null;

  @Column({ name: 'route_name', type: 'varchar', nullable: true })
  routeName: string | null;

  @Column({ name: 'self_delivery', default: false })
  selfDelivery: boolean;

  @Column({ type: 'varchar' })
  status: DbEstateStatus;

  @Column({
    name: 'ytd_deliveries_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  ytdDeliveriesKg: string;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string | null;

  @Column({ name: 'bank_branch', type: 'varchar', nullable: true })
  bankBranch: string | null;

  @Column({ name: 'bank_account', type: 'varchar', nullable: true })
  bankAccount: string | null;

  @Column({ name: 'last_updated_by', type: 'varchar', nullable: true })
  lastUpdatedBy: string | null;

  @Column({ name: 'last_updated_on', type: 'timestamp', nullable: true })
  lastUpdatedOn: Date | null;

  /**
   * Added 2026-07-28 (Estate Owner Lifetime History slice) — the tenure
   * anchor for EST-03's "Member since" / EST-10's Tenure Ribbon origin.
   * Distinct from `createdAt` (a row-insert timestamp, always ~seed time for
   * every seeded estate) so backfilled multi-year history is honest.
   */
  @Column({ name: 'registered_on', type: 'date' })
  registeredOn: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
