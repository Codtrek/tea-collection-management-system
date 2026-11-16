import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstateEntity } from '../estates/estate.entity';
import { EstateEmployee } from './estate-employee.entity';

/**
 * Maps `public.tea_estate_managers`. The Neon `dev` schema (captured in
 * `src/migrations/baseline.sql`) is the source of truth: column types,
 * nullability, defaults and constraint names here mirror it exactly.
 *
 * TypeORM matches foreign keys by name and drops any it does not know, so the
 * `foreignKeyConstraintName` values must stay identical to the database's.
 */
@Entity('tea_estate_managers')
export class EstateManager {
  @PrimaryGeneratedColumn()
  id: number;

  /** An employee manages at most one estate: UNIQUE via `tea_estate_managers_employee_id_key`. */
  @Column({ type: 'integer', unique: true })
  employee_id: number;

  @Column({ type: 'integer' })
  estate_id: number;

  @Column({ type: 'timestamp', nullable: true, default: () => 'now()' })
  assigned_at: Date | null;

  @ManyToOne(() => EstateEmployee)
  @JoinColumn({
    name: 'employee_id',
    foreignKeyConstraintName: 'tea_estate_managers_employee_id_fkey',
  })
  employee: EstateEmployee;

  @ManyToOne(() => EstateEntity)
  @JoinColumn({
    name: 'estate_id',
    foreignKeyConstraintName: 'tea_estate_managers_estate_id_fkey',
  })
  estate: EstateEntity;
}
