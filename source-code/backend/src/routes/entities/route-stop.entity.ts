import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('route_stops')
export class RouteStopEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  route_id: number;

  @Column()
  estate_id: number;

  @Column()
  stop_order: number;

  @Column({ default: false })
  has_tea_pickup: boolean;

  @Column({ default: false })
  has_fertilizer_delivery: boolean;
}
