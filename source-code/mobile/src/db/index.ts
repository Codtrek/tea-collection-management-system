import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Role } from '@/types/user';

const DEMO_PASSWORD = 'password123';

type SeedUser = { id: string; name: string; phone: string; password: string; role: Role };

// Demo accounts for the local-first shell (no backend yet). Same password for all,
// shown on the login screen so any role can be tried without a real auth server.
const SEED_USERS: SeedUser[] = [
  { id: '1', name: 'Nimal Perera', phone: '0770000001', password: DEMO_PASSWORD, role: 'estate_owner' },
  { id: '2', name: 'Sunil Fernando', phone: '0770000002', password: DEMO_PASSWORD, role: 'estate_manager' },
  { id: '3', name: 'Kamal Silva', phone: '0770000003', password: DEMO_PASSWORD, role: 'collection_agent' },
  { id: '4', name: 'Priyanka Jayasuriya', phone: '0770000004', password: DEMO_PASSWORD, role: 'receiving_officer' },
  { id: '5', name: 'Ruwan Bandara', phone: '0770000005', password: DEMO_PASSWORD, role: 'factory_admin' },
  { id: '6', name: 'Chamari Wickramasinghe', phone: '0770000006', password: DEMO_PASSWORD, role: 'factory_officer' },
  { id: '7', name: 'Dinesh Rathnayake', phone: '0770000007', password: DEMO_PASSWORD, role: 'factory_manager' },
  { id: '8', name: 'Anusha Gunasekara', phone: '0770000008', password: DEMO_PASSWORD, role: 'employee' },
];

async function initDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

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
