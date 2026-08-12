import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { Repository } from 'typeorm';
import { AgentDirectoryService } from './agent-directory.service';
import { DevicePushTokenEntity } from './device-push-token.entity';
import {
  NotificationEntity,
  type NotificationType,
} from './notification.entity';

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  referenceId?: number;
  referenceType?: string;
}

/**
 * In-app notification row + best-effort Expo push. A delivery failure must never fail
 * the business action that triggered it (same stance as AuditService.record).
 */
@Injectable()
export class DispatchNotifier {
  private readonly logger = new Logger(DispatchNotifier.name);
  /** expo-server-sdk is ESM-only — loaded on first push so it never touches boot or the unit tests. */
  private expo: Expo | null = null;

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    @InjectRepository(DevicePushTokenEntity)
    private readonly tokens: Repository<DevicePushTokenEntity>,
    private readonly directory: AgentDirectoryService,
  ) {}

  async notifyAgent(agentId: number, input: NotifyInput): Promise<void> {
    const agent = await this.directory.byId(agentId);
    if (!agent || !agent.userId) return;
    await this.notifyUser(agent.userId, input);
  }

  async notifyUser(userId: number, input: NotifyInput): Promise<void> {
    try {
      await this.notifications.save(
        this.notifications.create({
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          referenceId: input.referenceId ?? null,
          referenceType: input.referenceType ?? null,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Could not store notification: ${(err as Error).message}`,
      );
    }
    await this.push(userId, input);
  }

  private async push(userId: number, input: NotifyInput): Promise<void> {
    try {
      const rows = await this.tokens.find({ where: { userId } });
      if (rows.length === 0) return;
      const { Expo: ExpoClient } = await import('expo-server-sdk');
      this.expo ??= new ExpoClient();
      const expo = this.expo;
      const messages: ExpoPushMessage[] = rows
        .filter((r) => ExpoClient.isExpoPushToken(r.token))
        .map((r) => ({
          to: r.token,
          title: input.title,
          body: input.body,
          sound: 'default',
          data: {
            type: input.type,
            referenceId: input.referenceId,
            referenceType: input.referenceType,
          },
        }));
      for (const chunk of expo.chunkPushNotifications(messages)) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (err) {
      this.logger.warn(`Push delivery failed: ${(err as Error).message}`);
    }
  }
}
