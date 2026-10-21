import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';

interface RequestTracker {
  ip: string;
  userId: string | null;
  accountHash: string | null;
}

@Injectable()
export class IdentityThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions()
    options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(
    req: Record<string, any>,
  ): Promise<string> {
    const ip = req.ip ?? req.socket?.remoteAddress ??'unknown';

    let userId: string | null = null;

    // Verify the JWT before trusting its subject.
    const authorization = req.headers?.authorization;

    if (
      typeof authorization === 'string' &&
      authorization.startsWith('Bearer ')
    ) {
      const token = authorization.slice(7);

      try {
        const payload = await this.jwtService.verifyAsync<{
          sub?: string;
        }>(token);

        if (payload.sub) {
          userId = String(payload.sub);
        }
      } catch {
        // Invalid or expired tokens are treated as unauthenticated.
      }
    }

    const body = req.body ?? {};

  

    // Supports the current mobile login/register DTO field names.
    const accountValue = [
      body.phone,
      body.nic,
    ].find(
      (value) =>
        typeof value === 'string' && value.trim().length > 0,
    );

    console.log(`account value ${accountValue}`);

    const accountHash =
      typeof accountValue === 'string'
        ? createHash('sha256')
            .update(accountValue.trim().toLowerCase())
            .digest('hex')
        : null;

    const tracker: RequestTracker = {
      ip,
      userId,
      accountHash,
    };

    console.log(`tracker :`, tracker);
    return JSON.stringify(tracker);
  }

  protected generateKey(
    _context: ExecutionContext,
    trackerString: string,
    throttlerName: string,
  ): string {
    const tracker = JSON.parse(
      trackerString,
    ) as RequestTracker;

    console.log(throttlerName);
    // Strict account/user bucket; shared across endpoints.
    if (throttlerName === 'short') {
      if (tracker.userId) {
        return `identity:short:user:${tracker.userId}`;
      }

      if (tracker.accountHash) {
        return `identity:short:account:${tracker.ip}:${tracker.accountHash}`;
      }

      return `identity:short:ip:${tracker.ip}`;
    }

    // Broader network-level safety limits.
    if (throttlerName === 'medium' || throttlerName === 'long') {
      return `identity:${throttlerName}:ip:${tracker.ip}`;
    }

    // Login/registration account protection.
    if (throttlerName === 'auth') {
      if (tracker.accountHash) {
        return `identity:auth:account:${tracker.ip}:${tracker.accountHash}`;
      }

      return `identity:auth:ip:${tracker.ip}`;
    }

    return `identity:${throttlerName}:ip:${tracker.ip}`;
  }
}