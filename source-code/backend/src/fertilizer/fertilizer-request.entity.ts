import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DbRequestOrigin, DbRequestStatus } from './fertilizer-map';

/**
 * FERT-05..08. Extends the pre-existing `fertilizer_requests` table (created
 * for a dual owner/factory approval flow that the portal never built) with
 * the columns the portal's `FertilizerRequest` contract actually needs.
 * `ownerStatus`/`factoryStatus` stay mapped but unused by this slice — see
 * the init.sql comment.
 */
@Entity('fertilizer_requests')
export class FertilizerRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Nullable — the portal's FERT-07 "log phoned-in request" flow records
  // against an estate, not a specific manager (see init.sql).
  @Column({ name: 'requested_by', type: 'int', nullable: true })
  requestedBy: number | null;

  @Column({ name: 'estate_id' })
  estateId: number;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @Column()
  item: string;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2 })
  quantityKg: string;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({ name: 'factory_id', type: 'int', nullable: true })
  factoryId: number | null;

  @Column({ type: 'varchar' })
  origin: DbRequestOrigin;

  @Column({ type: 'varchar' })
  status: DbRequestStatus;

  @Column({
    name: 'approved_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  approvedQtyKg: string | null;

  @Column({
    name: 'dispatched_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  dispatchedQtyKg: string;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_on', type: 'timestamp', nullable: true })
  decidedOn: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
