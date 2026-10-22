import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  DbRequestOrigin,
  DbRequestStatus,
  PaymentMethod,
} from './fertilizer-map';

/**
 * FERT-05..08 + Fertilizer-Delivery-Addendum. Extends the pre-existing `fertilizer_requests` table (created
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

  /* ── Fertilizer-Delivery-Addendum ── */

  /** shared by the requests one order produced (one per item) */
  @Column({ name: 'order_ref', type: 'varchar', nullable: true })
  orderRef: string | null;

  /** the estate's route, auto-filled (each estate belongs to exactly one route) */
  @Column({ name: 'route_id', type: 'int', nullable: true })
  routeId: number | null;

  @Column({ name: 'payment_method', type: 'varchar', default: 'deduct' })
  paymentMethod: PaymentMethod;

  /** why a partial approval or a rejection — shown to the owner */
  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string | null;

  /** Rs./kg snapshotted at approval — never recalculated from the current price */
  @Column({
    name: 'rate_per_kg',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  ratePerKg: string | null;

  @Column({ name: 'price_id', type: 'int', nullable: true })
  priceId: number | null;

  @Column({
    name: 'delivered_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  deliveredQtyKg: string;

  /** failed attempts since the last review — Needs review at system_settings.fertilizer.maxDeliveryAttempts */
  @Column({ name: 'cycle_failures', type: 'int', default: 0 })
  cycleFailures: number;

  @Column({ name: 'manager_decided_by', type: 'varchar', nullable: true })
  managerDecidedBy: string | null;

  @Column({ name: 'manager_decided_on', type: 'timestamp', nullable: true })
  managerDecidedOn: Date | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
