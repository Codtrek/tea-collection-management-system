import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { readdirSync } from 'fs';
import { join, relative } from 'path';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PERMISSION_META, SERVICE_CHECKED_META } from './permissions';

/**
 * Every portal route (anything behind JwtAuthGuard) that READS data must say who may read it:
 * `@RequirePermission(...)` or `@PortalOnly()`. A new GET without one fails here, so an
 * unprotected read can't ship by accident (Users-Roles-Addendum §4a).
 */
type Ctor = { prototype: Record<string, unknown>; name: string };

function loadControllers(): Array<{ file: string; ctor: Ctor }> {
  const root = join(__dirname, '..');
  const files = (readdirSync(root, { recursive: true }) as string[]).filter(
    (f) => f.endsWith('.controller.ts'),
  );
  return files.flatMap((file) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(join(root, file)) as Record<string, unknown>;
    return Object.values(mod)
      .filter((v): v is Ctor => typeof v === 'function')
      .map((ctor) => ({ file, ctor }));
  });
}

const usesPortalGuard = (target: object): boolean =>
  ((Reflect.getMetadata(GUARDS_METADATA, target) as unknown[]) ?? []).includes(
    JwtAuthGuard,
  );

describe('portal read permissions — coverage', () => {
  const routes = loadControllers().flatMap(({ file, ctor }) => {
    const classGuarded = usesPortalGuard(ctor);
    return Object.getOwnPropertyNames(ctor.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => {
        const handler = ctor.prototype[name] as object;
        return {
          where: `${relative('.', file)} ${ctor.name}.${name}`,
          handler,
          isRoute: Reflect.getMetadata(PATH_METADATA, handler) !== undefined,
          method: Reflect.getMetadata(METHOD_METADATA, handler) as
            | RequestMethod
            | undefined,
          portal: classGuarded || usesPortalGuard(handler),
          labelled:
            Reflect.getMetadata(PERMISSION_META, handler) !== undefined ||
            Reflect.getMetadata(PERMISSION_META, ctor) !== undefined,
          serviceChecked:
            typeof Reflect.getMetadata(SERVICE_CHECKED_META, handler) ===
            'string',
        };
      })
      .filter((r) => r.isRoute && r.portal);
  });

  it('finds the portal routes (sanity)', () => {
    expect(
      routes.filter((r) => r.method === RequestMethod.GET).length,
    ).toBeGreaterThan(80);
  });

  it('every portal write has a matrix permission, @PortalOnly, or a documented @ServiceChecked', () => {
    const writes = routes.filter(
      (r) => r.method !== undefined && r.method !== RequestMethod.GET,
    );
    expect(writes.length).toBeGreaterThan(90);
    const missing = writes
      .filter((r) => !r.labelled && !r.serviceChecked)
      .map((r) => r.where);
    expect(missing).toEqual([]);
  });

  it('every portal GET route has @RequirePermission or @PortalOnly', () => {
    const missing = routes
      .filter((r) => r.method === RequestMethod.GET && !r.labelled)
      .map((r) => r.where);
    expect(missing).toEqual([]);
  });
});
