import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CollectionAgentEntity } from '../dispatch/collection-agent.entity';
import { EstateEntity } from '../estates/estate.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { RouteEntity } from '../estates/route.entity';
import type {
  DeliveryOutcome,
  DeliveryPhoto,
  FailReason,
} from './fertilizer-map';

/**
 * One delivery attempt — the fertilizer flag on the estate's stop on `scheduledDate`.
 * Before pickup nobody is stored as the agent: whoever runs the route that day
 * (`getAgentForRoute`, cover-aware) sees it. The officer's handover pins `pickupAgentId`.
 */
@Entity('fertilizer_deliveries')
@Check(
  'fertilizer_deliveries_fail_reason_check',
  `((fail_reason)::text = ANY ((ARRAY['owner_not_available'::character varying, 'road_not_passable'::character varying, 'owner_refused'::character varying, 'wrong_estate'::character varying, 'other'::character varying])::text[]))`,
)
@Check(
  'fertilizer_deliveries_outcome_check',
  `((outcome)::text = ANY ((ARRAY['delivered'::character varying, 'partial'::character varying, 'failed'::character varying])::text[]))`,
)
@Unique('fertilizer_deliveries_request_id_attempt_no_key', [
  'requestId',
  'attemptNo',
])
@Index('idx_fert_deliveries_agent', ['pickupAgentId'])
@Index('idx_fert_deliveries_route_date', ['routeId', 'scheduledDate'])
export class FertilizerDeliveryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  @ForeignKey(() => FertilizerRequestEntity, {
    name: 'fertilizer_deliveries_request_id_fkey',
  })
  requestId: number;

  @Column({ name: 'attempt_no' })
  attemptNo: number;

  @Column({ name: 'estate_id' })
  @ForeignKey(() => EstateEntity, {
    name: 'fertilizer_deliveries_estate_id_fkey',
  })
  estateId: number;

  @Column({ name: 'route_id' })
  @ForeignKey(() => RouteEntity, {
    name: 'fertilizer_deliveries_route_id_fkey',
  })
  routeId: number;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: string;

  @Column({ name: 'pickup_agent_id', type: 'int', nullable: true })
  @ForeignKey(() => CollectionAgentEntity, {
    name: 'fertilizer_deliveries_pickup_agent_id_fkey',
  })
  pickupAgentId: number | null;

  @Column({
    name: 'handover_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  handoverQtyKg: string | null;

  @Column({ name: 'handover_by', type: 'varchar', nullable: true, length: 100 })
  handoverBy: string | null;

  @Column({ name: 'handover_at', type: 'timestamptz', nullable: true })
  handoverAt: Date | null;

  @Column({
    name: 'agent_confirm_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  agentConfirmQtyKg: string | null;

  /** device time of the agent's confirmation */
  @Column({ name: 'agent_confirmed_at', type: 'timestamptz', nullable: true })
  agentConfirmedAt: Date | null;

  @Column({ name: 'pickup_mismatch', default: false })
  pickupMismatch: boolean;

  @Column({
    name: 'pickup_sync_key',
    type: 'varchar',
    nullable: true,
    length: 80,
    unique: true,
  })
  pickupSyncKey: string | null;

  @Column({ name: 'out_for_delivery_at', type: 'timestamptz', nullable: true })
  outForDeliveryAt: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 10 })
  outcome: DeliveryOutcome | null;

  @Column({
    name: 'delivered_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  deliveredQtyKg: string | null;

  @Column({ name: 'shortfall_reason', type: 'text', nullable: true })
  shortfallReason: string | null;

  @Column({ name: 'owner_name', type: 'varchar', nullable: true, length: 100 })
  ownerName: string | null;

  /** device time of the owner's confirm tap on the agent's phone */
  @Column({ name: 'owner_confirmed_at', type: 'timestamptz', nullable: true })
  ownerConfirmedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  photos: DeliveryPhoto[];

  @Column({ name: 'fail_reason', type: 'varchar', nullable: true, length: 20 })
  failReason: FailReason | null;

  @Column({ name: 'fail_note', type: 'text', nullable: true })
  failNote: string | null;

  /** device time of the outcome (kept through offline sync) */
  @Column({ name: 'recorded_at', type: 'timestamptz', nullable: true })
  recordedAt: Date | null;

  /** server time the outcome arrived */
  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date | null;

  @Column({
    name: 'outcome_sync_key',
    type: 'varchar',
    nullable: true,
    length: 80,
    unique: true,
  })
  outcomeSyncKey: string | null;

  @Column({
    name: 'checked_in_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  checkedInQtyKg: string | null;

  @Column({
    name: 'checked_in_by',
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  checkedInBy: string | null;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
