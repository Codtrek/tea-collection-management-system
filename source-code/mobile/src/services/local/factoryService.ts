import type { AsyncDb } from '@/db/asyncDb';
import { getDb } from '@/db';

import type { Factory, FactoryService } from '../types';

type FactoryRow = { id: string; name: string };

export function createLocalFactoryService(dbProvider: () => Promise<AsyncDb>): FactoryService {
  return {
    async listFactories(): Promise<Factory[]> {
      const db = await dbProvider();
      const rows = await db.getAllAsync<FactoryRow>('SELECT * FROM factories ORDER BY name');
      return rows.map((row) => ({ id: row.id, name: row.name }));
    },
  };
}

export const localFactoryService: FactoryService = createLocalFactoryService(getDb);
