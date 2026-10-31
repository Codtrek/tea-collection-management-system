import { Check, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { RouteEntity } from '../estates/route.entity';

/** Factory-defined "close" route pair, stored in both directions. Primary proximity signal. */
@Entity('route_neighbours')
@Check('route_neighbours_check', `"route_id" <> "neighbour_route_id"`)
export class RouteNeighbourEntity {
  @PrimaryColumn({ name: 'route_id', type: 'int' })
  @ForeignKey(() => RouteEntity, { name: 'route_neighbours_route_id_fkey' })
  routeId: number;

  @PrimaryColumn({ name: 'neighbour_route_id', type: 'int' })
  @ForeignKey(() => RouteEntity, {
    name: 'route_neighbours_neighbour_route_id_fkey',
  })
  neighbourRouteId: number;
}
