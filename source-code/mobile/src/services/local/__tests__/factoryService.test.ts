import type { AsyncDb } from '@/db/asyncDb';
import { createSchema } from '@/db/schema';
import { createInMemoryDb } from '@/db/testUtils/inMemoryDb';

import { createLocalFactoryService } from '../factoryService';

async function createDb(): Promise<AsyncDb> {
  const db = createInMemoryDb();
  await createSchema(db);
  await db.runAsync("INSERT INTO factories (id, name) VALUES ('factory-1', 'Nuwara Eliya Tea Factory')");
  return db;
}

test('lists all factories', async () => {
  const db = await createDb();
  const service = createLocalFactoryService(async () => db);

  const factories = await service.listFactories();

  expect(factories).toEqual([{ id: 'factory-1', name: 'Nuwara Eliya Tea Factory' }]);
});
