import type { AsyncDb } from '@/db/asyncDb';
import { createSchema } from '@/db/schema';
import { createInMemoryDb } from '@/db/testUtils/inMemoryDb';

import { createLocalEstateService } from '../estateService';

async function createDb(): Promise<AsyncDb> {
  const db = createInMemoryDb();
  await createSchema(db);
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('owner-1', 'Nimal Perera', '0770000001', 'x', 'estate_owner')",
  );
  await db.runAsync("INSERT INTO estates (id, owner_id, name) VALUES ('estate-1', 'owner-1', 'Green Valley Estate')");
  await db.runAsync("INSERT INTO estates (id, owner_id, name) VALUES ('estate-2', 'owner-1', 'Highland Tea Gardens')");
  return db;
}

test('lists all estates', async () => {
  const db = await createDb();
  const service = createLocalEstateService(async () => db);

  const estates = await service.listEstates();

  expect(estates).toEqual([
    { id: 'estate-1', ownerId: 'owner-1', name: 'Green Valley Estate' },
    { id: 'estate-2', ownerId: 'owner-1', name: 'Highland Tea Gardens' },
  ]);
});
