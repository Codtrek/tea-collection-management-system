import { Entity, PrimaryColumn } from 'typeorm';

/** Factory-defined "close" route pair, stored in both directions. Primary proximity signal. */
@Entity('route_neighbours')
export class RouteNeighbourEntity {
  @PrimaryColumn({ name: 'route_id' })
  routeId: number;

  @PrimaryColumn({ name: 'neighbour_route_id' })
  neighbourRouteId: number;
}
