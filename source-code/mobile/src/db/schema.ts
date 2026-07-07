import type { AsyncDb } from './asyncDb';

// Shared DDL applied to both the production expo-sqlite connection (src/db/index.ts) and the
// better-sqlite3-backed test connection (src/db/testUtils/inMemoryDb.ts), so tests exercise the
// same schema the app actually runs against.
export async function createSchema(db: AsyncDb): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estates (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY NOT NULL,
      route_date TEXT NOT NULL,
      collector_id TEXT NOT NULL REFERENCES users(id),
      truck_name TEXT,
      driver_name TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      status_reason TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS route_stops (
      id TEXT PRIMARY KEY NOT NULL,
      route_id TEXT NOT NULL REFERENCES routes(id),
      estate_id TEXT NOT NULL REFERENCES estates(id),
      stop_order INTEGER NOT NULL,
      has_tea_pickup INTEGER NOT NULL DEFAULT 0,
      has_fertilizer_delivery INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      reference_id TEXT,
      reference_type TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS factories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pickup_requests (
      id TEXT PRIMARY KEY NOT NULL,
      estate_id TEXT NOT NULL REFERENCES estates(id),
      owner_id TEXT NOT NULL REFERENCES users(id),
      factory_id TEXT NOT NULL REFERENCES factories(id),
      route_stop_id TEXT REFERENCES route_stops(id),
      request_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      decline_reason TEXT,
      estimated_weight_kg REAL,
      gps_pin_lat REAL,
      gps_pin_lng REAL,
      requested_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_pickup_per_estate_per_day
      ON pickup_requests (estate_id, request_date)
      WHERE status NOT IN ('expired', 'cancelled', 'completed');

    CREATE TABLE IF NOT EXISTS tea_collection_records (
      id TEXT PRIMARY KEY NOT NULL,
      pickup_request_id TEXT REFERENCES pickup_requests(id),
      route_stop_id TEXT REFERENCES route_stops(id),
      collector_id TEXT NOT NULL REFERENCES users(id),
      estate_id TEXT NOT NULL REFERENCES estates(id),
      actual_weight_kg REAL NOT NULL,
      self_delivered INTEGER NOT NULL DEFAULT 0,
      owner_confirmed INTEGER NOT NULL DEFAULT 0,
      evidence_url TEXT,
      evidence_status TEXT NOT NULL DEFAULT 'none',
      collected_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tea_receiving_records (
      id TEXT PRIMARY KEY NOT NULL,
      collection_record_id TEXT NOT NULL UNIQUE REFERENCES tea_collection_records(id),
      receiving_officer_id TEXT NOT NULL REFERENCES users(id),
      factory_id TEXT NOT NULL REFERENCES factories(id),
      received_weight_kg REAL NOT NULL,
      tea_grade TEXT NOT NULL,
      received_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      raised_by_user_id TEXT NOT NULL REFERENCES users(id),
      collection_record_id TEXT REFERENCES tea_collection_records(id),
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_payments (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      factory_id TEXT NOT NULL REFERENCES factories(id),
      payment_month TEXT NOT NULL,
      super_weight_kg REAL NOT NULL DEFAULT 0,
      normal_weight_kg REAL NOT NULL DEFAULT 0,
      gross_amount REAL NOT NULL,
      transport_cost REAL NOT NULL DEFAULT 0,
      fertilizer_deductions REAL NOT NULL DEFAULT 0,
      advance_deductions REAL NOT NULL DEFAULT 0,
      bank_transfer_fee REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      finalized_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_payment_per_owner_month
      ON monthly_payments (owner_id, factory_id, payment_month);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
  `);
}
