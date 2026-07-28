import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AppRole } from '../auth/role-map';
import { AuditLogEntity } from './audit-log.entity';
import {
  formatAuditId,
  type AuditModuleName,
  type PublicAuditEntry,
} from './audit-map';

/** Who performed the action. `sub` (users.id) is optional — name/role suffice. */
export interface AuditActor {
  name: string;
  role: AppRole;
  sub?: number | null;
}

export interface AuditRecordInput {
  action: string;
  module: AuditModuleName;
  record?: string;
  recordHref?: string;
  details?: string;
}

export interface AuditListFilters {
  module?: string;
  user?: string;
  search?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  /**
   * Best-effort — an audit write must NEVER break or roll back the business
   * mutation that triggered it. Any failure is logged and swallowed, so
   * callers can `await this.audit.record(...)` after a successful save without
   * guarding it themselves.
   */
  async record(actor: AuditActor, input: AuditRecordInput): Promise<void> {
    try {
      const seq = (await this.auditRepo.count()) + 1;
      const entity = this.auditRepo.create({
        id: formatAuditId(seq),
        userId: actor.sub ?? null,
        userName: actor.name,
        role: actor.role,
        action: input.action,
        module: input.module,
        record: input.record ?? null,
        recordHref: input.recordHref ?? null,
        details: input.details ?? null,
      });
      await this.auditRepo.save(entity);
    } catch (err) {
      this.logger.error(
        `Failed to record audit entry (${input.module}: ${input.action}): ${String(err)}`,
      );
    }
  }

  /** ADM-04 — newest first, optionally filtered. Small table; filtered in memory. */
  async list(filters: AuditListFilters = {}): Promise<PublicAuditEntry[]> {
    const rows = await this.auditRepo.find({ order: { createdAt: 'DESC' } });
    const q = filters.search?.toLowerCase().trim();
    return rows
      .filter((r) => !filters.module || r.module === filters.module)
      .filter((r) => !filters.user || r.userName === filters.user)
      .filter((r) => {
        if (!q) return true;
        return (
          r.action.toLowerCase().includes(q) ||
          (r.record ?? '').toLowerCase().includes(q) ||
          (r.details ?? '').toLowerCase().includes(q)
        );
      })
      .map((r) => this.toPublic(r));
  }

  private toPublic(row: AuditLogEntity): PublicAuditEntry {
    return {
      id: row.id,
      timestamp: row.createdAt.toISOString(),
      user: row.userName,
      role: row.role,
      action: row.action,
      module: row.module,
      record: row.record ?? undefined,
      recordHref: row.recordHref ?? undefined,
      details: row.details ?? undefined,
    };
  }
}
