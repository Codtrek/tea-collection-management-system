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

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const factory = await client.query<{ id: number }>(
      `INSERT INTO factories (name, location) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING id`,
      [FACTORY_NAME, 'Nuwara Eliya'],
    );
    const factoryId =
      factory.rows[0]?.id ??
      (
        await client.query<{ id: number }>(
          `SELECT id FROM factories WHERE name = $1`,
          [FACTORY_NAME],
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
