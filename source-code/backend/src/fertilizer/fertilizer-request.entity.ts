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
import { EstateEntity } from '../estates/estate.entity';
import { EstateOwnerEntity } from '../estates/estate-owner.entity';
import { EstateEmployee } from '../users/estate-employee.entity';
import { Factory } from '../users/factory.entity';
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
@Check(
  'fertilizer_requests_factory_status_check',
  `"factory_status" IN ('pending', 'approved', 'rejected')`,
)
@Check('fertilizer_requests_origin_check', `"origin" IN ('mobile', 'web')`)
@Check(
  'fertilizer_requests_owner_status_check',
  `"owner_status" IN ('pending', 'approved', 'rejected')`,
)
@Check(
  'fertilizer_requests_status_check',
  `"status" IN ('Requested', 'Awaiting manager approval', 'Approved', 'Partially approved', 'Rejected', 'Ready for dispatch', 'Picked up', 'Out for delivery', 'Partially delivered', 'Delivered', 'Failed', 'Returned to factory', 'Rescheduled', 'Needs review', 'Cancelled')`,
)
@Index('idx_fertilizer_requests_estate', ['estateId'])
@Index('idx_fertilizer_requests_status', ['status'])
@Check(
  'fertilizer_requests_payment_method_check',
  `((payment_method)::text = ANY ((ARRAY['deduct'::character varying, 'cash'::character varying, 'bank'::character varying])::text[]))`,
)
@Index('idx_fertilizer_requests_order', ['orderRef'])
export class FertilizerRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Nullable — the portal's FERT-07 "log phoned-in request" flow records
  // against an estate, not a specific manager (see init.sql).
  @Column({ name: 'requested_by', type: 'int', nullable: true })
  @ForeignKey(() => EstateEmployee, {
    name: 'fertilizer_requests_requested_by_fkey',
  })
  requestedBy: number | null;

  @Column({ name: 'estate_id', type: 'int' })
  @ForeignKey(() => EstateEntity, {
    name: 'fertilizer_requests_estate_id_fkey',
  })
  estateId: number;

  @Column({ name: 'owner_id', type: 'int' })
  @ForeignKey(() => EstateOwnerEntity, {
    name: 'fertilizer_requests_owner_id_fkey',
  })
  ownerId: number;

  @Column({ type: 'varchar', length: 100, default: 'Urea Fertilizer' })
  item: string;

  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2 })
  quantityKg: string;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  /**
   * Legacy dual owner/factory approval columns, kept for a possible future
   * mobile approval step. The portal runs off `status` and never sets them.
   */
  @Column({
    name: 'owner_status',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: 'pending',
  })
  ownerStatus: string | null;

  @Column({ name: 'factory_id', type: 'int', nullable: true })
  @ForeignKey(() => Factory, { name: 'fertilizer_requests_factory_id_fkey' })
  factoryId: number | null;

  @Column({
    name: 'factory_status',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: 'pending',
  })
  factoryStatus: string | null;

  @Column({ type: 'varchar', length: 10, default: 'web' })
  origin: DbRequestOrigin;

  @Column({ type: 'varchar', length: 30, default: 'Requested' })
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

  @Column({ name: 'decided_by', type: 'varchar', length: 100, nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_on', type: 'timestamp', nullable: true })
  decidedOn: Date | null;

  /* ── Fertilizer-Delivery-Addendum ── */

  /** shared by the requests one order produced (one per item) */
  @Column({ name: 'order_ref', type: 'varchar', nullable: true, length: 30 })
  orderRef: string | null;

  /** the estate's route, auto-filled (each estate belongs to exactly one route) */
  @Column({ name: 'route_id', type: 'int', nullable: true })
  @ForeignKey(() => RouteEntity, { name: 'fertilizer_requests_route_id_fkey' })
  routeId: number | null;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    default: 'deduct',
    length: 10,
  })
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

  @Column({
    name: 'manager_decided_by',
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  managerDecidedBy: string | null;

  @Column({ name: 'manager_decided_on', type: 'timestamp', nullable: true })
  managerDecidedOn: Date | null;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    nullable: true,
    default: () => 'now()',
  })
  updatedAt: Date | null;

  /** Nullable in the DB, but always filled by its `DEFAULT now()`. */
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;
}
