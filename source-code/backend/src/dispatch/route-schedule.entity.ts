import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A route's fixed weekly pattern — one row per weekday it runs (0 = Sunday … 6 = Saturday).
 * Read only through `RouteScheduleService` (Route-Schedule-Addendum §2).
 */
@Entity('route_schedule_weekdays')
export class RouteScheduleWeekdayEntity {
  @PrimaryColumn({ name: 'route_id' })
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
export class RouteScheduleOverrideEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'route_id' })
  routeId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar' })
  kind: OverrideKind;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'move_group', type: 'uuid', nullable: true })
  moveGroup: string | null;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
