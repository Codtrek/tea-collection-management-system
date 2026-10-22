import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
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
export class FertilizerDeliveryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id' })
  requestId: number;

  @Column({ name: 'attempt_no' })
  attemptNo: number;

  @Column({ name: 'estate_id' })
  estateId: number;

  @Column({ name: 'route_id' })
  routeId: number;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: string;

  @Column({ name: 'pickup_agent_id', type: 'int', nullable: true })
  pickupAgentId: number | null;

  @Column({
    name: 'handover_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  handoverQtyKg: string | null;

  @Column({ name: 'handover_by', type: 'varchar', nullable: true })
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

  @Column({ name: 'pickup_sync_key', type: 'varchar', nullable: true })
  pickupSyncKey: string | null;

  @Column({ name: 'out_for_delivery_at', type: 'timestamptz', nullable: true })
  outForDeliveryAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
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

  @Column({ name: 'owner_name', type: 'varchar', nullable: true })
  ownerName: string | null;

  /** device time of the owner's confirm tap on the agent's phone */
  @Column({ name: 'owner_confirmed_at', type: 'timestamptz', nullable: true })
  ownerConfirmedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  photos: DeliveryPhoto[];

  @Column({ name: 'fail_reason', type: 'varchar', nullable: true })
  failReason: FailReason | null;

  @Column({ name: 'fail_note', type: 'text', nullable: true })
  failNote: string | null;

  /** device time of the outcome (kept through offline sync) */
  @Column({ name: 'recorded_at', type: 'timestamptz', nullable: true })
  recordedAt: Date | null;

  /** server time the outcome arrived */
  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date | null;

  @Column({ name: 'outcome_sync_key', type: 'varchar', nullable: true })
  outcomeSyncKey: string | null;

  @Column({
    name: 'checked_in_qty_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  checkedInQtyKg: string | null;

  @Column({ name: 'checked_in_by', type: 'varchar', nullable: true })
  checkedInBy: string | null;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
