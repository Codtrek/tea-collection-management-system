import BetterSqlite3 from 'better-sqlite3';
import type { AsyncDb, SqlParam } from '../asyncDb';

// Test-only AsyncDb backed by a real SQL engine (better-sqlite3), since expo-sqlite's native
// module doesn't run under Jest. Never import this from production code.
export function createInMemoryDb(): AsyncDb {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');

  return {
    async execAsync(source: string) {
      db.exec(source);
    },
    async runAsync(source: string, ...params: SqlParam[]) {
      const info = db.prepare(source).run(...params);
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
    },
    async getFirstAsync<T>(source: string, ...params: SqlParam[]) {
      const row = db.prepare(source).get(...params) as T | undefined;
      return row ?? null;
    },
    async getAllAsync<T>(source: string, ...params: SqlParam[]) {
      return db.prepare(source).all(...params) as T[];
    },
  };
}
