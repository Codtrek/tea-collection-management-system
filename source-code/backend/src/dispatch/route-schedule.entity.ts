import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RouteEntity } from '../estates/route.entity';

/**
 * A route's fixed weekly pattern — one row per weekday it runs (0 = Sunday … 6 = Saturday).
 * Read only through `RouteScheduleService` (Route-Schedule-Addendum §2).
 */
@Entity('route_schedule_weekdays')
@Check(
  'route_schedule_weekdays_weekday_check',
  `((weekday >= 0) AND (weekday <= 6))`,
)
export class RouteScheduleWeekdayEntity {
  @PrimaryColumn({ name: 'route_id' })
  @ForeignKey(() => RouteEntity, {
    name: 'route_schedule_weekdays_route_id_fkey',
  })
  routeId: number;

  @PrimaryColumn({ type: 'smallint' })
  weekday: number;
}

export type OverrideKind = 'ADD' | 'CANCEL';

/**
 * A one-date exception that wins over the weekly pattern. At most one per route per date.
 * A "move" is a CANCEL + an ADD that share `moveGroup`.
 */
@Entity('route_schedule_overrides')
@Check(
  'route_schedule_overrides_kind_check',
  `((kind)::text = ANY ((ARRAY['ADD'::character varying, 'CANCEL'::character varying])::text[]))`,
)
@Unique('route_schedule_overrides_route_id_date_key', ['routeId', 'date'])
@Index('idx_route_overrides_route_date', ['routeId', 'date'])
export class RouteScheduleOverrideEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'route_id' })
  @ForeignKey(() => RouteEntity, {
    name: 'route_schedule_overrides_route_id_fkey',
  })
  routeId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 6 })
  kind: OverrideKind;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'move_group', type: 'uuid', nullable: true })
  moveGroup: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
