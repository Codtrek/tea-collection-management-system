import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GradingNotificationService } from './grading-notification.service';

/**
 * Kept apart from the service because `@nestjs/schedule` is ESM-only and Jest can't load it
 * (same split as dispatch/dispatch.tasks.ts). The logic under test is `sweep()`.
 */
@Injectable()
export class GradingNotificationTasks {
  private readonly logger = new Logger(GradingNotificationTasks.name);

  constructor(private readonly service: GradingNotificationService) {}

  /** Every minute: release held owner notifications whose correction window has ended. Safe on several instances. */
  @Cron('* * * * *')
  async tick(): Promise<void> {
    try {
      const n = await this.service.sweep();
      if (n > 0) this.logger.log(`Sent ${n} owner notification(s).`);
    } catch (err) {
      this.logger.warn(`Notification sweep failed: ${(err as Error).message}`);
    }
  }
}
