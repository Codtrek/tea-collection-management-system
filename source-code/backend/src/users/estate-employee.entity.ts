import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Estate } from './estate.entity';
import { User } from './user.entity';

/**
 * Maps `public.estate_employees`. The Neon `dev` schema (captured in
 * `src/migrations/baseline.sql`) is the source of truth: column types, lengths,
 * nullability, defaults and constraint names here mirror it exactly.
 *
 * TypeORM matches CHECK constraints, foreign keys and indexes by name and drops
 * any it does not know, so those names must stay identical to the database's.
 */
@Entity('estate_employees')
@Check(
  'estate_employees_role_check',
  `"role" IN ('manager', 'plucking_employee')`,
)
export class EstateEmployee {
  @PrimaryGeneratedColumn()
  id: number;

  /** One employee profile per user: UNIQUE via `estate_employees_user_id_key`. */
  @Column({ type: 'integer', unique: true })
  @ForeignKey(() => User, { name: 'estate_employees_user_id_fkey' })
  user_id: number;

  @Column({ type: 'integer' })
  @ForeignKey(() => Estate, { name: 'estate_employees_estate_id_fkey' })
  @Index('idx_estate_employees_estate')
  estate_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** DATE: TypeORM hydrates it as a `YYYY-MM-DD` string. */
  @Column({ type: 'date' })
  date_of_birth: string;

  /** UNIQUE via `estate_employees_nic_key`. */
  @Column({ type: 'varchar', length: 20, unique: true })
  nic: string;

  @Column({ type: 'varchar', length: 30 })
  role: 'manager' | 'plucking_employee';

  @Column({ type: 'boolean', nullable: true, default: true })
  is_active: boolean | null;
}
