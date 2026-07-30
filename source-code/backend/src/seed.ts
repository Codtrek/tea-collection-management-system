/**
 * Dev seed: one factory-portal user per role so the portal is testable end-to-end.
 * Idempotent — safe to re-run (upserts by phone / user_id).
 *
 * Usage: npm run seed
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const DEV_PASSWORD = 'Password123!';
const FACTORY_NAME = 'Nuwara Eliya Tea Factory';

const SEED_USERS = [
  {
    phone: '0771234567',
    role: 'factory_admin',
    name: 'A. Bandara',
    nic: '198512345601',
  },
  {
    phone: '0771234568',
    role: 'factory_officer',
    name: 'S. Fernando',
    nic: '199012345602',
  },
  {
    phone: '0771234569',
    role: 'factory_manager',
    name: 'R. Jayasuriya',
    nic: '198812345603',
  },
] as const;

const USER_ROLES = [
  'estate_owner',
  'estate_manager',
  'plucking_employee',
  'collection_agent',
  'receiving_officer',
  'factory_admin',
  'factory_officer',
  'factory_manager',
] as const;

const FACTORY_EMPLOYEE_ROLES = [
  'collection_agent',
  'receiving_officer',
  'factory_admin',
  'factory_officer',
  'factory_manager',
] as const;

/** Patch role CHECK constraints on volumes created before auth-slice schema updates. */
async function ensureDevSchema(client: Client) {
  const userRoles = USER_ROLES.map((role) => `'${role}'`).join(', ');
  await client.query(
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
  );
  await client.query(
    `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (${userRoles}))`,
  );

  const factoryRoles = FACTORY_EMPLOYEE_ROLES.map((role) => `'${role}'`).join(
    ', ',
  );
  await client.query(
    `ALTER TABLE factory_employees DROP CONSTRAINT IF EXISTS factory_employees_role_check`,
  );
  await client.query(
    `ALTER TABLE factory_employees ADD CONSTRAINT factory_employees_role_check CHECK (role IN (${factoryRoles}))`,
  );
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await ensureDevSchema(client);

    const existingFactory = await client.query<{ id: number }>(
      `SELECT id FROM factories WHERE name = $1 LIMIT 1`,
      [FACTORY_NAME],
    );
    const factoryId =
      existingFactory.rows[0]?.id ??
      (
        await client.query<{ id: number }>(
          `INSERT INTO factories (name, location) VALUES ($1, $2) RETURNING id`,
          [FACTORY_NAME, 'Nuwara Eliya'],
        )
      ).rows[0].id;

    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

    for (const seedUser of SEED_USERS) {
      const user = await client.query<{ id: number }>(
        `INSERT INTO users (phone, password_hash, role) VALUES ($1, $2, $3)
         ON CONFLICT (phone) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [seedUser.phone, passwordHash, seedUser.role],
      );
      const userId = user.rows[0].id;

      await client.query(
        `INSERT INTO factory_employees (user_id, factory_id, name, nic, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role`,
        [userId, factoryId, seedUser.name, seedUser.nic, seedUser.role],
      );

      console.log(
        `Seeded ${seedUser.role} — phone: ${seedUser.phone}, password: ${DEV_PASSWORD}`,
      );
    }
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
