import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Minimal read-mostly view of `routes` for the Estates module's system
 * route-assignment (EST-02). There's no dedicated Routes module yet — this
 * is not the owning entity for the table, just what auto-assignment needs.
 */
@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'factory_id' })
  factoryId: number;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;
}
