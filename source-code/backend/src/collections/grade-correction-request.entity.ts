import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { PublicRevisionLine } from './collection-map';

/** A request to change the grade lines of a LOCKED or SETTLED delivery. One pending per delivery. */
@Entity('grade_correction_requests')
export class GradeCorrectionRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id' })
  deliveryId: string;

  @Column({ type: 'jsonb' })
  lines: PublicRevisionLine[];

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ name: 'decided_by', type: 'varchar', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote: string | null;
}
