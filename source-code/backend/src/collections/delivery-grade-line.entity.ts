import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import type { DbGrade } from './collection-map';
import { CollectionRecordEntity } from './collection-record.entity';

/**
 * One factory-assigned grade line of a delivery. Grading is FACTORY-SIDE ONLY — agents
 * and owners never write these (Claude.md § Weight verification). At most one line per
 * grade per delivery (DB UNIQUE). A delivery's graded total is the SUM of its lines;
 * there is deliberately no stored total.
 */
@Entity('delivery_grade_lines')
export class DeliveryGradeLineEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id' })
  deliveryId: string;

  @Column({ type: 'varchar' })
  grade: DbGrade;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 2 })
  weightKg: string;

  @Column({ name: 'graded_by' })
  gradedBy: string;

  @Column({ name: 'graded_at', type: 'timestamp' })
  gradedAt: Date;

  @ManyToOne(() => CollectionRecordEntity, (r) => r.gradeLines, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'delivery_id' })
  delivery: Relation<CollectionRecordEntity>;
}
