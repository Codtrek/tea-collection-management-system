import {
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmployeeEntity } from '../employees/employee.entity';
import { User } from '../users/user.entity';

/** A dated note from a conversation with an employee — private to Manager and Administrator (Performance-Addendum §5). */
@Entity('performance_notes')
@Index('idx_performance_notes_employee', ['employeeId'])
export class PerformanceNoteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  @ForeignKey(() => EmployeeEntity, {
    name: 'performance_notes_employee_id_fkey',
  })
  employeeId: number;

  @Column({ type: 'text' })
  note: string;

  @Column({ type: 'varchar', length: 100 })
  author: string;

  @Column({ name: 'author_user_id', type: 'int', nullable: true })
  @ForeignKey(() => User, { name: 'performance_notes_author_user_id_fkey' })
  authorUserId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
