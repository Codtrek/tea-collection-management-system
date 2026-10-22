import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FertilizerNotificationService } from './fertilizer-notification.service';

/**
 * Kept apart from the service because `@nestjs/schedule` is ESM-only and Jest can't load it
 * (same split as grading-notification.tasks.ts). The logic under test is `sweep()`.
 */
@Injectable()
export class FertilizerNotificationTasks {
  private readonly logger = new Logger(FertilizerNotificationTasks.name);

  constructor(private readonly service: FertilizerNotificationService) {}

  /** Every minute: send queued fertilizer owner notices. Safe on several instances. */
  @Cron('* * * * *')
  async tick(): Promise<void> {
    try {
      const n = await this.service.sweep();
      if (n > 0) this.logger.log(`Sent ${n} fertilizer owner notice(s).`);
    } catch (err) {
      this.logger.warn(
        `Fertilizer notice sweep failed: ${(err as Error).message}`,
      );
    }
  }
}
