import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PermissionLevel } from '../admin/admin-map';
import { RolePermissionEntity } from '../admin/role-permission.entity';

const ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'approve'];

/**
 * Data-driven gate on the `dispatch` module — reads the same `role_permissions`
 * matrix the portal's `can()` reads (ADM-02), so a factory re-configuring who may
 * mark absence or reassign routes needs no code change. Never hardcode a role here.
 */
@Injectable()
export class DispatchAccessService {
  constructor(
    @InjectRepository(RolePermissionEntity)
    private readonly perms: Repository<RolePermissionEntity>,
  ) {}

  async levelFor(role: string, module = 'dispatch'): Promise<PermissionLevel> {
    const row = await this.perms.findOne({ where: { role, module } });
    const level = row?.level as PermissionLevel | undefined;
    return level && ORDER.includes(level) ? level : 'none';
  }

  async require(
    role: string,
    needed: Exclude<PermissionLevel, 'none'>,
    what: string,
    module = 'dispatch',
  ): Promise<void> {
    const have = await this.levelFor(role, module);
    if (ORDER.indexOf(have) < ORDER.indexOf(needed)) {
      throw new ForbiddenException(`Your role may not ${what}.`);
    }
  }
}
