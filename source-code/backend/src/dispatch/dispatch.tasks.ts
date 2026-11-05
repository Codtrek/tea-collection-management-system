import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AgentLocationPingEntity } from './agent-location-ping.entity';
import { RouteResolverService } from './route-resolver.service';

/** Location-history retention: pings older than this are deleted nightly. */
export const PING_RETENTION_DAYS = 30;

@Injectable()
export class DispatchTasks {
  private readonly logger = new Logger(DispatchTasks.name);

  constructor(
    private readonly resolver: RouteResolverService,
    @InjectRepository(AgentLocationPingEntity)
    private readonly pings: Repository<AgentLocationPingEntity>,
  ) {}

  /** PENDING cover requests past their timeout → EXPIRED (the board then suggests the next candidate). */
  @Cron('* * * * *')
  async sweepExpiredCovers(): Promise<void> {
    try {
      const expired = await this.resolver.expireStale();
      if (expired.length > 0) {
        this.logger.log(
          `Expired ${expired.length} unanswered cover request(s).`,
        );
      }
    } catch (err) {
      this.logger.warn(`Cover sweep failed: ${(err as Error).message}`);
    }
  }

  /** Retention: drop ping history beyond 30 days. Covers need no sweep — their window ends with the day. */
  @Cron('30 2 * * *', { timeZone: 'Asia/Colombo' })
  async purgeOldPings(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - PING_RETENTION_DAYS * 86_400_000);
      const result = await this.pings.delete({ recordedAt: LessThan(cutoff) });
      this.logger.log(
        `Purged ${result.affected ?? 0} location ping(s) older than ${PING_RETENTION_DAYS} days.`,
      );
    } catch (err) {
      this.logger.warn(`Ping purge failed: ${(err as Error).message}`);
    }
  }
}
