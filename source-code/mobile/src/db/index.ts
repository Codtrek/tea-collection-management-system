import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Role } from '@/types/user';

import { createSchema } from './schema';

const DEMO_PASSWORD = 'password123';

type SeedUser = { id: string; name: string; phone: string; password: string; role: Role };
type SeedEstate = { id: string; ownerId: string; name: string };
type SeedFactory = { id: string; name: string };

const SEED_ESTATES: SeedEstate[] = [
  { id: 'estate-1', ownerId: '1', name: 'Green Valley Estate' },
  { id: 'estate-2', ownerId: '1', name: 'Highland Tea Gardens' },
  { id: 'estate-3', ownerId: '1', name: 'Riverside Plantation' },
];

const SEED_FACTORIES: SeedFactory[] = [{ id: 'factory-1', name: 'Nuwara Eliya Tea Factory' }];

// Demo accounts for the local-first shell (no backend yet). Same password for all,
// shown on the login screen so any role can be tried without a real auth server.
const SEED_USERS: SeedUser[] = [
  { id: '1', name: 'Nimal Perera', phone: '0770000001', password: DEMO_PASSWORD, role: 'estate_owner' },
  { id: '2', name: 'Sunil Fernando', phone: '0770000002', password: DEMO_PASSWORD, role: 'estate_manager' },
  { id: '3', name: 'Kamal Silva', phone: '0770000003', password: DEMO_PASSWORD, role: 'collector' },
  { id: '4', name: 'Priyanka Jayasuriya', phone: '0770000004', password: DEMO_PASSWORD, role: 'receiving_officer' },
  { id: '5', name: 'Ruwan Bandara', phone: '0770000005', password: DEMO_PASSWORD, role: 'factory_admin' },
  { id: '6', name: 'Chamari Wickramasinghe', phone: '0770000006', password: DEMO_PASSWORD, role: 'factory_officer' },
  { id: '7', name: 'Dinesh Rathnayake', phone: '0770000007', password: DEMO_PASSWORD, role: 'factory_manager' },
  { id: '8', name: 'Anusha Gunasekara', phone: '0770000008', password: DEMO_PASSWORD, role: 'employee' },
];

async function initDatabase(database: SQLiteDatabase) {
  await createSchema(database);

  // Self-heal rows seeded before the collection_agent -> collector role rename; editing the
  // seed array alone has no effect on a device that already seeded the old value.
  await database.runAsync("UPDATE users SET role = 'collector' WHERE role = 'collection_agent'");

  const existing = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (!existing || existing.count === 0) {
    for (const user of SEED_USERS) {
      await database.runAsync(
        'INSERT INTO users (id, name, phone, password, role) VALUES (?, ?, ?, ?, ?)',
        user.id,
        user.name,
        user.phone,
        user.password,
        user.role,
      );
    }
    for (const estate of SEED_ESTATES) {
      await database.runAsync(
        'INSERT INTO estates (id, owner_id, name) VALUES (?, ?, ?)',
        estate.id,
        estate.ownerId,
        estate.name,
      );
    }
    for (const factory of SEED_FACTORIES) {
      await database.runAsync('INSERT INTO factories (id, name) VALUES (?, ?)', factory.id, factory.name);
    }
  }
}

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('tea_collection.db').then(async (database) => {
      await initDatabase(database);
      return database;
    });
  }
  return dbPromise;
}
