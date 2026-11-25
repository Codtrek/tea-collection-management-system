import {
  ForbiddenException,
  Injectable,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource, In } from 'typeorm';
import { RolePermissionEntity } from '../admin/role-permission.entity';
import type { JwtPayload } from './jwt-payload.interface';
import {
  PERMISSION_META,
  permissionRefusal,
  type PermissionRequirement,
} from './permissions';

/**
 * Portal authentication (JwtStrategy → checkPortalSession), then the route's
 * `@RequirePermission` against `role_permissions` for the caller's role — read on every request,
 * no cache, so a matrix change applies to the very next request. The role comes from the DB
 * (checkPortalSession), never the token claim. A route with no permission metadata is allowed
 * after authentication (writes keep their service-level checks until they move to the matrix);
 * the coverage test makes sure no GET route is in that state.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!(await super.canActivate(context))) return false;
    const need = this.reflector.getAllAndOverride<
      PermissionRequirement | undefined
    >(PERMISSION_META, [context.getHandler(), context.getClass()]);
    if (!need || need.keys.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user: JwtPayload }>().user;
    const rows = await this.dataSource
      .getRepository(RolePermissionEntity)
      .find({
        where: { role: user.role, module: In(need.keys) },
      });
    const refusal = permissionRefusal(
      need,
      Object.fromEntries(rows.map((r) => [r.module, r.level])),
    );
    if (refusal) throw new ForbiddenException(refusal);
    return true;
  }
}
