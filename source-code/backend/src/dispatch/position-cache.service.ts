import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CachedPosition {
  lat: number;
  lng: number;
  /** device time of the fix, ISO */
  recordedAt: string;
  source: 'ping' | 'checkin';
}

const KEY = (agentId: number) => `agent:pos:${agentId}`;
/** Positions are only meaningful within a shift; 12h comfortably covers one. */
const TTL_SECONDS = 12 * 60 * 60;

/**
 * Latest-position cache. Redis when reachable; otherwise an in-process map, so a
 * missing Redis degrades (single instance only) instead of breaking the board.
 * Postgres (`agent_location_pings`) remains the durable history either way.
 */
@Injectable()
export class PositionCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(PositionCacheService.name);
  private readonly memory = new Map<number, CachedPosition>();
  private redis: Redis | null = null;
  private warned = false;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    if (url) {
      this.redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 2000, 30_000),
      });
      this.redis.on('error', (err: Error) => this.warnOnce(err.message));
      this.redis.connect().catch((err: Error) => this.warnOnce(err.message));
    }
  }

  /** Stores the fix only if it is newer than what is cached (batches arrive out of order). */
  async setLatest(agentId: number, pos: CachedPosition): Promise<void> {
    const current = await this.getLatest(agentId);
    if (current && current.recordedAt >= pos.recordedAt) return;
    this.memory.set(agentId, pos);
    if (!this.redis) return;
    try {
      await this.redis.set(
        KEY(agentId),
        JSON.stringify(pos),
        'EX',
        TTL_SECONDS,
      );
    } catch (err) {
      this.warnOnce((err as Error).message);
    }
  }

  async getLatest(agentId: number): Promise<CachedPosition | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(KEY(agentId));
        if (raw) return JSON.parse(raw) as CachedPosition;
      } catch (err) {
        this.warnOnce((err as Error).message);
      }
    }
    return this.memory.get(agentId) ?? null;
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
  }

  private warnOnce(message: string): void {
    if (this.warned) return;
    this.warned = true;
    this.logger.warn(
      `Redis unavailable (${message}) — using the in-process position cache; board falls back to Postgres history.`,
    );
  }
}
