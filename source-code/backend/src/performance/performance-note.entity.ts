import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A dated note from a conversation with an employee — private to Manager and Administrator (Performance-Addendum §5). */
@Entity('performance_notes')
export class PerformanceNoteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @Column({ type: 'text' })
  note: string;

  @Column({ type: 'varchar' })
  author: string;

  @Column({ name: 'author_user_id', type: 'int', nullable: true })
  authorUserId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
