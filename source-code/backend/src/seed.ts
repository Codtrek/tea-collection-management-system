/**
 * Dev seed: one factory-portal user per role so the portal is testable end-to-end,
 * plus reference estates/routes/collection agents and a set of Tea Leaf Collection
 * records spanning every status (mirrors the portal's former `features/collections/
 * data.ts` fixture, now served from the real backend).
 *
 * Idempotent — safe to re-run (upserts by phone / user_id / business key).
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

const ROUTE_NAMES = ['Route 2', 'Route 3', 'Route 5'] as const;

const ESTATE_SEEDS = [
  {
    ownerPhone: '0777000001',
    ownerName: 'K. Perera',
    estateName: 'Green Valley Estate',
    location: 'Nuwara Eliya',
    route: 'Route 3',
  },
  {
    ownerPhone: '0777000002',
    ownerName: 'M. Dissanayake',
    estateName: 'Hilltop Estate',
    location: 'Nuwara Eliya',
    route: 'Route 5',
  },
  {
    ownerPhone: '0777000003',
    ownerName: 'P. Wickramasinghe',
    estateName: 'Mount Rest Estate',
    location: 'Nuwara Eliya',
    route: 'Route 2',
  },
  {
    ownerPhone: '0777000004',
    ownerName: 'D. Herath',
    estateName: 'Silver Peak Estate',
    location: 'Nuwara Eliya',
    route: 'Route 3',
  },
] as const;

const AGENT_SEEDS = [
  { phone: '0777000011', name: 'R. Senanayake', nic: '198712345701' },
  { phone: '0777000012', name: 'W. Gunaratne', nic: '198912345702' },
] as const;

interface SeedPhoto {
  label:
    | 'Agent collection photo'
    | 'Manager verification photo'
    | 'Handover photo';
  timestamp: string;
  takenBy: string;
}

interface SeedTimelineEntry {
  status: string;
  timestamp: string;
  by?: string;
}

interface SeedCollectionRecord {
  id: string;
  estateName: string;
  routeName: string;
  weightKg: number;
  grade: 'super' | 'normal' | 'pending';
  status:
    | 'submitted'
    | 'approved'
    | 'agent_assigned'
    | 'collected'
    | 'confirmed'
    | 'pending_agent_confirmation';
  date: string;
  agentName: string; // 'Self-delivered' maps to a null agent_id
  photos: SeedPhoto[];
  timeline: SeedTimelineEntry[];
  provisional?: { reportedBy: string; reason: string };
  mismatch?: { complaintId: string; note: string };
}

/* Mirrors the portal's former `features/collections/data.ts` fixture 1:1, so the
   wired-up UI looks the same as it did on mock data. */
const COLLECTION_RECORD_SEEDS: SeedCollectionRecord[] = [
  {
    id: 'GV-2026-0714',
    estateName: 'Green Valley Estate',
    routeName: 'Route 3',
    weightKg: 210,
    grade: 'super',
    status: 'confirmed',
    date: '2026-07-14',
    agentName: 'R. Senanayake',
    photos: [
      {
        label: 'Agent collection photo',
        timestamp: '2026-07-14T08:42:00',
        takenBy: 'R. Senanayake',
      },
      {
        label: 'Manager verification photo',
        timestamp: '2026-07-14T11:05:00',
        takenBy: 'R. Jayasuriya',
      },
      {
        label: 'Handover photo',
        timestamp: '2026-07-14T11:20:00',
        takenBy: 'R. Senanayake',
      },
    ],
    timeline: [
      {
        status: 'Submitted',
        timestamp: '2026-07-13T18:04:00',
        by: 'K. Perera',
      },
      {
        status: 'Approved',
        timestamp: '2026-07-13T19:12:00',
        by: 'S. Fernando',
      },
      {
        status: 'Agent Assigned',
        timestamp: '2026-07-13T19:12:00',
        by: 'System',
      },
      {
        status: 'Collected',
        timestamp: '2026-07-14T08:42:00',
        by: 'R. Senanayake',
      },
      {
        status: 'Confirmed',
        timestamp: '2026-07-14T11:20:00',
        by: 'R. Jayasuriya',
      },
    ],
  },
  {
    id: 'HT-2026-0716',
    estateName: 'Hilltop Estate',
    routeName: 'Route 5',
    weightKg: 145,
    grade: 'normal',
    status: 'confirmed',
    date: '2026-07-16',
    agentName: 'W. Gunaratne',
    photos: [
      {
        label: 'Agent collection photo',
        timestamp: '2026-07-16T07:55:00',
        takenBy: 'W. Gunaratne',
      },
      {
        label: 'Manager verification photo',
        timestamp: '2026-07-16T10:30:00',
        takenBy: 'R. Jayasuriya',
      },
      {
        label: 'Handover photo',
        timestamp: '2026-07-16T10:41:00',
        takenBy: 'W. Gunaratne',
      },
    ],
    timeline: [
      {
        status: 'Submitted',
        timestamp: '2026-07-15T17:20:00',
        by: 'M. Dissanayake',
      },
      {
        status: 'Approved',
        timestamp: '2026-07-15T18:02:00',
        by: 'S. Fernando',
      },
      {
        status: 'Agent Assigned',
        timestamp: '2026-07-15T18:02:00',
        by: 'System',
      },
      {
        status: 'Collected',
        timestamp: '2026-07-16T07:55:00',
        by: 'W. Gunaratne',
      },
      {
        status: 'Confirmed',
        timestamp: '2026-07-16T10:41:00',
        by: 'R. Jayasuriya',
      },
    ],
    mismatch: {
      complaintId: 'CMP-2026-0009',
      note: 'Owner reported 152 kg at pickup; agent recorded 145 kg. Complaint open.',
    },
  },
  {
    id: 'MR-2026-0717',
    estateName: 'Mount Rest Estate',
    routeName: 'Route 2',
    weightKg: 188,
    grade: 'super',
    status: 'collected',
    date: '2026-07-17',
    agentName: 'R. Senanayake',
    photos: [
      {
        label: 'Agent collection photo',
        timestamp: '2026-07-17T09:10:00',
        takenBy: 'R. Senanayake',
      },
    ],
    timeline: [
      {
        status: 'Submitted',
        timestamp: '2026-07-16T18:44:00',
        by: 'P. Wickramasinghe',
      },
      {
        status: 'Approved',
        timestamp: '2026-07-16T19:30:00',
        by: 'S. Fernando',
      },
      {
        status: 'Agent Assigned',
        timestamp: '2026-07-16T19:30:00',
        by: 'System',
      },
      {
        status: 'Collected',
        timestamp: '2026-07-17T09:10:00',
        by: 'R. Senanayake',
      },
    ],
  },
  {
    id: 'SP-2026-0717',
    estateName: 'Silver Peak Estate',
    routeName: 'Route 3',
    weightKg: 96,
    grade: 'pending',
    status: 'agent_assigned',
    date: '2026-07-17',
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [
      {
        status: 'Submitted',
        timestamp: '2026-07-17T06:15:00',
        by: 'D. Herath',
      },
      {
        status: 'Approved',
        timestamp: '2026-07-17T07:00:00',
        by: 'S. Fernando',
      },
      {
        status: 'Agent Assigned',
        timestamp: '2026-07-17T07:00:00',
        by: 'System',
      },
    ],
  },
  {
    id: 'GV-2026-0718',
    estateName: 'Green Valley Estate',
    routeName: 'Route 3',
    weightKg: 175,
    grade: 'pending',
    status: 'pending_agent_confirmation',
    date: '2026-07-18',
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [
      {
        status: 'Pending Agent Confirmation',
        timestamp: '2026-07-18T08:05:00',
        by: 'S. Fernando',
      },
    ],
    provisional: {
      reportedBy: 'S. Fernando',
      reason:
        'Phone-arranged pickup — owner called the factory directly; not yet in the mobile app.',
    },
  },
  {
    id: 'HT-2026-0718',
    estateName: 'Hilltop Estate',
    routeName: 'Route 5',
    weightKg: 132,
    grade: 'pending',
    status: 'submitted',
    date: '2026-07-18',
    agentName: 'W. Gunaratne',
    photos: [],
    timeline: [
      {
        status: 'Submitted',
        timestamp: '2026-07-18T06:40:00',
        by: 'M. Dissanayake',
      },
    ],
  },
  {
    id: 'GV-2026-0710',
    estateName: 'Green Valley Estate',
    routeName: 'Route 3',
    weightKg: 198,
    grade: 'super',
    status: 'confirmed',
    date: '2026-07-10',
    agentName: 'R. Senanayake',
    photos: [
      {
        label: 'Agent collection photo',
        timestamp: '2026-07-10T08:30:00',
        takenBy: 'R. Senanayake',
      },
      {
        label: 'Manager verification photo',
        timestamp: '2026-07-10T10:58:00',
        takenBy: 'R. Jayasuriya',
      },
      {
        label: 'Handover photo',
        timestamp: '2026-07-10T11:07:00',
        takenBy: 'R. Senanayake',
      },
    ],
    timeline: [
      {
        status: 'Submitted',
        timestamp: '2026-07-09T17:50:00',
        by: 'K. Perera',
      },
      {
        status: 'Approved',
        timestamp: '2026-07-09T18:31:00',
        by: 'S. Fernando',
      },
      {
        status: 'Agent Assigned',
        timestamp: '2026-07-09T18:31:00',
        by: 'System',
      },
      {
        status: 'Collected',
        timestamp: '2026-07-10T08:30:00',
        by: 'R. Senanayake',
      },
      {
        status: 'Confirmed',
        timestamp: '2026-07-10T11:07:00',
        by: 'R. Jayasuriya',
      },
    ],
  },
  {
    id: 'MR-2026-0708',
    estateName: 'Mount Rest Estate',
    routeName: 'Route 2',
    weightKg: 164,
    grade: 'normal',
    status: 'confirmed',
    date: '2026-07-08',
    agentName: 'Self-delivered',
    photos: [
      {
        label: 'Manager verification photo',
        timestamp: '2026-07-08T09:22:00',
        takenBy: 'R. Jayasuriya',
      },
      {
        label: 'Handover photo',
        timestamp: '2026-07-08T09:31:00',
        takenBy: 'P. Wickramasinghe',
      },
    ],
    timeline: [
      {
        status: 'Submitted',
        timestamp: '2026-07-08T07:00:00',
        by: 'P. Wickramasinghe',
      },
      {
        status: 'Approved',
        timestamp: '2026-07-08T07:45:00',
        by: 'S. Fernando',
      },
      {
        status: 'Collected',
        timestamp: '2026-07-08T09:00:00',
        by: 'P. Wickramasinghe',
      },
      {
        status: 'Confirmed',
        timestamp: '2026-07-08T09:31:00',
        by: 'R. Jayasuriya',
      },
    ],
  },
];

/** Manual find-then-insert for tables without a usable unique constraint (routes, estates). */
async function findOrCreate(
  client: Client,
  selectSql: string,
  selectParams: unknown[],
  insertSql: string,
  insertParams: unknown[],
): Promise<number> {
  const existing = await client.query<{ id: number }>(selectSql, selectParams);
  if (existing.rows[0]) return existing.rows[0].id;
  const inserted = await client.query<{ id: number }>(insertSql, insertParams);
  return inserted.rows[0].id;
}

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // `factories` has no unique constraint, so this can't rely on ON CONFLICT —
    // find-or-create by name instead (see `findOrCreate` below).
    const factoryId = await findOrCreate(
      client,
      `SELECT id FROM factories WHERE name = $1`,
      [FACTORY_NAME],
      `INSERT INTO factories (name, location) VALUES ($1, $2) RETURNING id`,
      [FACTORY_NAME, 'Nuwara Eliya'],
    );

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

    // ── Collections reference data (routes, estates, collection agents) ──

    const routeIds: Record<string, number> = {};
    for (const routeName of ROUTE_NAMES) {
      routeIds[routeName] = await findOrCreate(
        client,
        `SELECT id FROM routes WHERE factory_id = $1 AND name = $2`,
        [factoryId, routeName],
        `INSERT INTO routes (factory_id, name) VALUES ($1, $2) RETURNING id`,
        [factoryId, routeName],
      );
    }

    const estateIds: Record<string, number> = {};
    for (const e of ESTATE_SEEDS) {
      const ownerUser = await client.query<{ id: number }>(
        `INSERT INTO users (phone, password_hash, role) VALUES ($1, $2, 'estate_owner')
         ON CONFLICT (phone) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [e.ownerPhone, passwordHash],
      );
      const ownerUserId = ownerUser.rows[0].id;

      const owner = await client.query<{ id: number }>(
        `INSERT INTO tea_estate_owners (user_id, name) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [ownerUserId, e.ownerName],
      );
      const ownerId = owner.rows[0].id;

      estateIds[e.estateName] = await findOrCreate(
        client,
        `SELECT id FROM estates WHERE owner_id = $1 AND name = $2`,
        [ownerId, e.estateName],
        `INSERT INTO estates (owner_id, name, location) VALUES ($1, $2, $3) RETURNING id`,
        [ownerId, e.estateName, e.location],
      );
    }

    const agentIds: Record<string, number> = {};
    for (const a of AGENT_SEEDS) {
      const agentUser = await client.query<{ id: number }>(
        `INSERT INTO users (phone, password_hash, role) VALUES ($1, $2, 'collection_agent')
         ON CONFLICT (phone) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [a.phone, passwordHash],
      );
      const agentUserId = agentUser.rows[0].id;

      const employee = await client.query<{ id: number }>(
        `INSERT INTO factory_employees (user_id, factory_id, name, nic, role)
         VALUES ($1, $2, $3, $4, 'collection_agent')
         ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [agentUserId, factoryId, a.name, a.nic],
      );
      const employeeId = employee.rows[0].id;

      const collectionAgent = await client.query<{ id: number }>(
        `INSERT INTO collection_agents (employee_id, factory_id, is_available)
         VALUES ($1, $2, true)
         ON CONFLICT (employee_id) DO UPDATE SET is_available = EXCLUDED.is_available
         RETURNING id`,
        [employeeId, factoryId],
      );
      agentIds[a.name] = collectionAgent.rows[0].id;
    }

    console.log(
      `Seeded ${ROUTE_NAMES.length} routes, ${ESTATE_SEEDS.length} estates, ${AGENT_SEEDS.length} collection agents`,
    );

    // ── Tea Leaf Collection records (COL-01..04) ──

    for (const c of COLLECTION_RECORD_SEEDS) {
      const estateId = estateIds[c.estateName] ?? null;
      const routeId = routeIds[c.routeName] ?? null;
      const agentId =
        c.agentName === 'Self-delivered'
          ? null
          : (agentIds[c.agentName] ?? null);

      await client.query(
        `INSERT INTO tea_collection_records
           (id, estate_id, estate_name, route_id, route_name, weight_kg, grade, status,
            collection_date, agent_id, agent_name, photos, timeline, provisional, mismatch)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           estate_id = EXCLUDED.estate_id,
           estate_name = EXCLUDED.estate_name,
           route_id = EXCLUDED.route_id,
           route_name = EXCLUDED.route_name,
           weight_kg = EXCLUDED.weight_kg,
           grade = EXCLUDED.grade,
           status = EXCLUDED.status,
           collection_date = EXCLUDED.collection_date,
           agent_id = EXCLUDED.agent_id,
           agent_name = EXCLUDED.agent_name,
           photos = EXCLUDED.photos,
           timeline = EXCLUDED.timeline,
           provisional = EXCLUDED.provisional,
           mismatch = EXCLUDED.mismatch`,
        [
          c.id,
          estateId,
          c.estateName,
          routeId,
          c.routeName,
          c.weightKg,
          c.grade,
          c.status,
          c.date,
          agentId,
          c.agentName,
          JSON.stringify(c.photos),
          JSON.stringify(c.timeline),
          c.provisional ? JSON.stringify(c.provisional) : null,
          c.mismatch ? JSON.stringify(c.mismatch) : null,
        ],
      );
    }

    console.log(`Seeded ${COLLECTION_RECORD_SEEDS.length} collection records`);
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
