export type SqlParam = string | number | null;

// Minimal subset of expo-sqlite's SQLiteDatabase async API that services depend on.
// Lets tests inject a non-native (better-sqlite3-backed) implementation via DI instead of
// mocking expo-sqlite's native module, which doesn't run under Jest.
export interface AsyncDb {
  execAsync(source: string): Promise<void>;
  runAsync(
    source: string,
    ...params: SqlParam[]
  ): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(source: string, ...params: SqlParam[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: SqlParam[]): Promise<T[]>;
}
