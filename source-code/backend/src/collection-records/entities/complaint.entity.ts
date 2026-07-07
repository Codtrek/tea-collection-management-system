import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ComplaintType = 'weight_mismatch' | 'fertilizer_quality';

@Entity('complaints')
export class ComplaintEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  type: ComplaintType;

  @Column()
  raised_by_user_id: number;

  @Column({ type: 'int', nullable: true })
  collection_record_id: number | null;

  @Column({ type: 'int', nullable: true })
  fertilizer_request_id: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', default: 'open' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  created_at: Date;
}
