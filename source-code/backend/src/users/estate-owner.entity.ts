import {
  Column,
  Entity,
  ForeignKey,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Estate } from './estate.entity';
import { User } from './user.entity';

/**
 * Maps `public.tea_estate_owners`. The Neon `dev` schema (captured in
 * `src/migrations/baseline.sql`) is the source of truth: column types, lengths,
 * nullability and constraint names here mirror it exactly.
 *
 * TypeORM matches foreign keys by name and drops any it does not know, so the
 * `@ForeignKey` name must stay identical to the database's.
 */
@Entity('tea_estate_owners')
export class EstateOwner {
  @PrimaryGeneratedColumn()
  id: number;

  /** One owner profile per user: UNIQUE via `tea_estate_owners_user_id_key`. */
  @Column({ type: 'integer', unique: true })
  @ForeignKey(() => User, { name: 'tea_estate_owners_user_id_fkey' })
  user_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  contact: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nic: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @OneToMany(() => Estate, (estate) => estate.owner)
  estate: Estate[];
}
