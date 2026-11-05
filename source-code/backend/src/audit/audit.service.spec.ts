import type { Repository } from 'typeorm';
import type { AuditLogEntity } from './audit-log.entity';
import { AuditService, type AuditActor } from './audit.service';

/** Minimal in-memory stand-in for the Repository surface AuditService uses. */
class FakeRepository<T extends { id: string }> {
  private readonly store = new Map<string, T>();

  find(): Promise<T[]> {
    return Promise.resolve([...this.store.values()]);
  }

  count(): Promise<number> {
    return Promise.resolve(this.store.size);
  }

  create(partial: Partial<T>): T {
    return partial as T;
  }

  save(record: T): Promise<T> {
    const withCreatedAt = { createdAt: new Date(), ...record } as T;
    this.store.set(withCreatedAt.id, withCreatedAt);
    return Promise.resolve(withCreatedAt);
  }
}

const actor: AuditActor = { name: 'A. Bandara', role: 'Administrator', sub: 1 };

describe('AuditService', () => {
  it('records an entry with the actor and payload, formatting a running id', async () => {
    const repo = new FakeRepository<AuditLogEntity>();
    const service = new AuditService(repo as unknown as Repository<AuditLogEntity>);

    await service.record(actor, {
      action: 'Updated grade rates',
      module: 'Administration',
      record: 'GR-2026-0004',
      details: 'Super Rs. 190/kg · Normal Rs. 98/kg',
    });

    const rows = await service.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'AUD-00001',
      user: 'A. Bandara',
      role: 'Administrator',
      action: 'Updated grade rates',
      module: 'Administration',
      record: 'GR-2026-0004',
    });
  });

  it('increments the id sequence across records', async () => {
    const repo = new FakeRepository<AuditLogEntity>();
    const service = new AuditService(repo as unknown as Repository<AuditLogEntity>);

    await service.record(actor, { action: 'A', module: 'Reports' });
    await service.record(actor, { action: 'B', module: 'Reports' });

    const rows = await service.list();
    // list() is newest-first; both ids assigned in order
    expect(rows.map((r) => r.id).sort()).toEqual(['AUD-00001', 'AUD-00002']);
  });

  it('swallows a repository failure so the business mutation is never broken', async () => {
    const throwing = {
      count: () => Promise.reject(new Error('db down')),
      create: () => ({}),
      save: () => Promise.reject(new Error('db down')),
    } as unknown as Repository<AuditLogEntity>;
    const service = new AuditService(throwing);

    // Must resolve, not reject — the mutation-safety contract.
    await expect(
      service.record(actor, { action: 'X', module: 'Collection' }),
    ).resolves.toBeUndefined();
  });

  it('filters by module and search term', async () => {
    const repo = new FakeRepository<AuditLogEntity>();
    const service = new AuditService(repo as unknown as Repository<AuditLogEntity>);

    await service.record(actor, {
      action: 'Processed settlement run',
      module: 'Estate Owner',
      details: 'June 2026',
    });
    await service.record(actor, { action: 'Logged expense', module: 'Reports' });

    expect(await service.list({ module: 'Reports' })).toHaveLength(1);
    expect(await service.list({ search: 'settlement' })).toHaveLength(1);
    expect(await service.list({ search: 'nomatch' })).toHaveLength(0);
  });
});
