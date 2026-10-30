import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
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
@Check('delivery_grade_lines_grade_check', `"grade" IN ('super', 'normal')`)
@Check('delivery_grade_lines_weight_kg_check', `"weight_kg" > 0`)
@Unique('delivery_grade_lines_delivery_id_grade_key', ['deliveryId', 'grade'])
@Index('idx_grade_lines_delivery', ['deliveryId'])
export class DeliveryGradeLineEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id', type: 'varchar', length: 20 })
  deliveryId: string;

  @Column({ type: 'varchar', length: 10 })
  grade: DbGrade;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 2 })
  weightKg: string;

  @Column({ name: 'graded_by', type: 'varchar', length: 100 })
  gradedBy: string;

  @Column({ name: 'graded_at', type: 'timestamp', default: () => 'now()' })
  gradedAt: Date;

  @ManyToOne(() => CollectionRecordEntity, (r) => r.gradeLines, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({
    name: 'delivery_id',
    foreignKeyConstraintName: 'delivery_grade_lines_delivery_id_fkey',
  })
  delivery: Relation<CollectionRecordEntity>;
}
