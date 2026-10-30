import { Column, Entity, ForeignKey, PrimaryGeneratedColumn } from 'typeorm';
import { Factory } from '../users/factory.entity';

/**
 * Minimal mapping of `public.routes`, exactly as it exists in the Neon `dev`
 * schema (captured in `src/migrations/baseline.sql`).
 *
 * It exists so `Estate.route_id` can declare its `estates_route_id_fkey`
 * foreign key: TypeORM can only reference mapped tables, and drops any foreign
 * key it does not know about. Extend this entity when the Routes module is built.
 */
@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @ForeignKey(() => Factory, { name: 'routes_factory_id_fkey' })
  factory_id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;
}
