import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import type { TeaGrade } from '../collection-status.util';

@Entity('tea_receiving_records')
export class TeaReceivingRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  collection_record_id: number;

  @Column()
  receiving_officer_id: number;

  @Column()
  factory_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  received_weight_kg: string;

  @Column({ type: 'varchar' })
  tea_grade: TeaGrade;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  received_at: Date;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;
}
