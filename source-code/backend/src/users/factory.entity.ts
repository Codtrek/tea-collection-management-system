import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Maps `public.factories`. The Neon `dev` schema (captured in
 * `src/migrations/baseline.sql`) is the source of truth: column types, lengths
 * and nullability here mirror it exactly.
 */
@Entity('factories')
export class Factory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  location: string | null;
}
