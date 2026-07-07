import type { AsyncDb } from '@/db/asyncDb';
import { getDb } from '@/db';

import type { Estate, EstateService } from '../types';

type EstateRow = { id: string; owner_id: string; name: string };

export function createLocalEstateService(dbProvider: () => Promise<AsyncDb>): EstateService {
  return {
    async listEstates(): Promise<Estate[]> {
      const db = await dbProvider();
      const rows = await db.getAllAsync<EstateRow>('SELECT * FROM estates ORDER BY name');
      return rows.map((row) => ({ id: row.id, ownerId: row.owner_id, name: row.name }));
    },
  };
}

export const localEstateService: EstateService = createLocalEstateService(getDb);
