import { Column, Entity, ForeignKey, PrimaryGeneratedColumn } from 'typeorm';
import { Factory } from '../users/factory.entity';

/**
 * Minimal read-mostly view of `routes` for the Estates module's system
 * route-assignment (EST-02). There's no dedicated Routes module yet — extend
 * this entity when one is built.
 *
 * The only mapping of `public.routes`; it mirrors `src/migrations/baseline.sql`
 * exactly, since TypeORM drops any foreign key it does not know about.
 */
@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'factory_id', type: 'integer' })
  @ForeignKey(() => Factory, { name: 'routes_factory_id_fkey' })
  factoryId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;
}
