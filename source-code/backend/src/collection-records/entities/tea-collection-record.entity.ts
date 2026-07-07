import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tea_collection_records')
export class TeaCollectionRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  pickup_request_id: number | null;

  @Column({ type: 'int', nullable: true })
  route_stop_id: number | null;

  @Column()
  collector_id: number;

  @Column()
  estate_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  actual_weight_kg: string;

  @Column({ type: 'boolean', default: false })
  self_delivered: boolean;

  @Column({ type: 'boolean', default: false })
  owner_confirmed: boolean;

  @Column({ type: 'varchar', nullable: true })
  evidence_url: string | null;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  collected_at: Date;
}
