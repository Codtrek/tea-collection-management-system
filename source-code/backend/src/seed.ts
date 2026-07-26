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

interface SeedDocument {
  name: string;
  uploadedOn: string;
}

interface SeedEstate {
  ownerPhone: string;
  ownerName: string;
  nic: string;
  contact: string;
  email?: string;
  estateName: string;
  location: string;
  address: string;
  route: string;
  selfDelivery: boolean;
  status: 'active' | 'inactive';
  ytdDeliveriesKg: number;
  bank: { bank: string; branch: string; account: string };
  documents: SeedDocument[];
  lastUpdatedBy?: string;
  lastUpdatedOn?: string;
}

// Mirrors the portal's former `features/estates/data.ts` ESTATES fixture 1:1
// (Estates + Payments vertical slice, 2026-07-26).
const ESTATE_SEEDS: SeedEstate[] = [
  {
    ownerPhone: '0777000001',
    ownerName: 'K. Perera',
    nic: '197845678123',
    contact: '0772345678',
    email: 'kperera@gmail.com',
    estateName: 'Green Valley Estate',
    location: 'Nuwara Eliya',
    address: 'Green Valley, Kandapola Rd, Nuwara Eliya',
    route: 'Route 3',
    selfDelivery: false,
    status: 'active',
    ytdDeliveriesKg: 12480,
    bank: {
      bank: 'Bank of Ceylon',
      branch: 'Nuwara Eliya',
      account: '8802345671',
    },
    documents: [
      { name: 'Estate ownership deed.pdf', uploadedOn: '2025-02-14' },
      { name: 'NIC copy.pdf', uploadedOn: '2025-02-14' },
    ],
    lastUpdatedBy: 'A. Bandara',
    lastUpdatedOn: '2026-06-30',
  },
  {
    ownerPhone: '0777000002',
    ownerName: 'M. Dissanayake',
    nic: '198212345987',
    contact: '0713456789',
    estateName: 'Hilltop Estate',
    location: 'Hatton',
    address: 'Hilltop Division, Dickoya Rd, Hatton',
    route: 'Route 5',
    selfDelivery: false,
    status: 'active',
    ytdDeliveriesKg: 9310,
    bank: { bank: "People's Bank", branch: 'Hatton', account: '1104567892' },
    documents: [
      { name: 'Estate ownership deed.pdf', uploadedOn: '2025-03-02' },
    ],
  },
  {
    ownerPhone: '0777000003',
    ownerName: 'P. Wickramasinghe',
    nic: '196934567012',
    contact: '0764567890',
    email: 'mountrest@yahoo.com',
    estateName: 'Mount Rest Estate',
    location: 'Kandy',
    address: 'Mount Rest, Pussellawa Rd, Kandy',
    route: 'Route 2',
    selfDelivery: true,
    status: 'active',
    ytdDeliveriesKg: 11020,
    bank: { bank: 'Commercial Bank', branch: 'Kandy', account: '7709876543' },
    documents: [
      { name: 'Estate ownership deed.pdf', uploadedOn: '2024-11-20' },
      { name: 'Self-delivery agreement.pdf', uploadedOn: '2025-01-08' },
    ],
  },
  {
    ownerPhone: '0777000004',
    ownerName: 'D. Herath',
    nic: '199056789234',
    contact: '0785678901',
    estateName: 'Silver Peak Estate',
    location: 'Talawakelle',
    address: 'Silver Peak Division, Talawakelle',
    route: 'Route 3',
    selfDelivery: false,
    status: 'active',
    ytdDeliveriesKg: 4890,
    // Missing bank details — excluded from settlement runs until added (UC-054 exception).
    bank: { bank: '', branch: '', account: '' },
    documents: [{ name: 'NIC copy.pdf', uploadedOn: '2026-01-15' }],
  },
  {
    ownerPhone: '0777000005',
    ownerName: 'J. Kumara',
    nic: '197512398765',
    contact: '0726789012',
    estateName: 'Riverside Estate',
    location: 'Gampola',
    address: 'Riverside, Nawalapitiya Rd, Gampola',
    route: 'Route 2',
    selfDelivery: false,
    status: 'inactive',
    ytdDeliveriesKg: 1560,
    bank: { bank: 'Sampath Bank', branch: 'Gampola', account: '3301239876' },
    documents: [
      { name: 'Estate ownership deed.pdf', uploadedOn: '2024-08-05' },
    ],
    lastUpdatedBy: 'A. Bandara',
    lastUpdatedOn: '2026-04-12',
  },
];

interface SeedAdvance {
  id: string;
  estateName: string;
  amount: number;
  reason: string;
  dateIssued: string;
  issuedBy: string;
  status: 'pending_deduction' | 'deducted';
}

// Mirrors the portal's former ESTATE_ADVANCES fixture 1:1.
const ADVANCE_SEEDS: SeedAdvance[] = [
  {
    id: 'EADV-2026-0031',
    estateName: 'Green Valley Estate',
    amount: 50000,
    reason: 'Pre-season plucking labour costs',
    dateIssued: '2026-07-05',
    issuedBy: 'S. Fernando',
    status: 'pending_deduction',
  },
  {
    id: 'EADV-2026-0028',
    estateName: 'Hilltop Estate',
    amount: 30000,
    reason: 'Fertilizer application labour',
    dateIssued: '2026-06-21',
    issuedBy: 'S. Fernando',
    status: 'pending_deduction',
  },
  {
    id: 'EADV-2026-0022',
    estateName: 'Mount Rest Estate',
    amount: 40000,
    reason: 'Transport vehicle repair',
    dateIssued: '2026-05-30',
    issuedBy: 'A. Bandara',
    status: 'deducted',
  },
];

interface SeedSettlement {
  id: string;
  estateName: string;
  period: string;
  superKg: number;
  normalKg: number;
  superRate: number;
  normalRate: number;
  transportCost: number;
  fertilizerDeduction: number;
  advanceDeduction: number;
  status: 'pending' | 'processed';
  selfDelivery: boolean;
  missingBank?: boolean;
  processedBy?: string;
  processedOn?: string;
}

// Mirrors the portal's former SETTLEMENTS fixture 1:1 (July 2026 run + 2
// already-processed June 2026 rows). Rates from Factory Setup (ADM-01, not
// built yet): Super Rs. 185/kg, Normal Rs. 95/kg effective 01/07/2026.
const SETTLEMENT_SEEDS: SeedSettlement[] = [
  {
    id: 'SET-2026-07-001',
    estateName: 'Green Valley Estate',
    period: 'July 2026',
    superKg: 408,
    normalKg: 175,
    superRate: 185,
    normalRate: 95,
    transportCost: 8400,
    fertilizerDeduction: 22800,
    advanceDeduction: 50000,
    status: 'pending',
    selfDelivery: false,
  },
  {
    id: 'SET-2026-07-002',
    estateName: 'Hilltop Estate',
    period: 'July 2026',
    superKg: 120,
    normalKg: 277,
    superRate: 185,
    normalRate: 95,
    transportCost: 6100,
    fertilizerDeduction: 11400,
    advanceDeduction: 30000,
    status: 'pending',
    selfDelivery: false,
  },
  {
    id: 'SET-2026-07-003',
    estateName: 'Mount Rest Estate',
    period: 'July 2026',
    superKg: 188,
    normalKg: 164,
    superRate: 185,
    normalRate: 95,
    transportCost: 0,
    fertilizerDeduction: 15200,
    advanceDeduction: 0,
    status: 'pending',
    selfDelivery: true,
  },
  {
    id: 'SET-2026-07-004',
    estateName: 'Silver Peak Estate',
    period: 'July 2026',
    superKg: 96,
    normalKg: 0,
    superRate: 185,
    normalRate: 95,
    transportCost: 3800,
    fertilizerDeduction: 3800,
    advanceDeduction: 0,
    status: 'pending',
    selfDelivery: false,
    missingBank: true,
  },
  {
    id: 'SET-2026-06-001',
    estateName: 'Green Valley Estate',
    period: 'June 2026',
    superKg: 380,
    normalKg: 214,
    superRate: 180,
    normalRate: 92,
    transportCost: 7900,
    fertilizerDeduction: 0,
    advanceDeduction: 0,
    status: 'processed',
    selfDelivery: false,
    processedBy: 'A. Bandara',
    processedOn: '2026-07-01',
  },
  {
    id: 'SET-2026-06-003',
    estateName: 'Mount Rest Estate',
    period: 'June 2026',
    superKg: 240,
    normalKg: 198,
    superRate: 180,
    normalRate: 92,
    transportCost: 0,
    fertilizerDeduction: 7600,
    advanceDeduction: 40000,
    status: 'processed',
    selfDelivery: true,
    processedBy: 'A. Bandara',
    processedOn: '2026-07-01',
  },
];

interface SeedEmployee {
  name: string;
  nic: string;
  dob: string;
  contact: string;
  address: string;
  role: string;
  department: string;
  hireDate: string;
  employmentType: 'Permanent' | 'Contract' | 'Casual';
  status: 'Active' | 'Suspended' | 'Inactive';
  bank: { bank: string; branch: string; account: string };
  dayRate: number;
  dayOtRate: number;
  nightRate: number;
  nightOtRate: number;
  hasLogin: boolean;
  lastUpdatedBy?: string;
  lastUpdatedOn?: string;
}

// Mirrors the portal's former `features/employees/data.ts` EMPLOYEES fixture
// 1:1 (Employees + Payroll vertical slice, 2026-07-26), extended with the new
// rate columns. `hasLogin` is stored as a flag only — this slice never
// provisions a `users` row for an employee (Employee self-service login is
// out of scope for the admin portal; see Claude.md).
const EMPLOYEE_SEEDS: SeedEmployee[] = [
  {
    name: 'K. Perera',
    nic: '199012345678',
    dob: '1990-05-12',
    contact: '0771234567',
    address: 'No. 21, Temple Rd, Nuwara Eliya',
    role: 'Factory Officer',
    department: 'Operations',
    hireDate: '2024-03-12',
    employmentType: 'Permanent',
    status: 'Active',
    bank: {
      bank: 'Bank of Ceylon',
      branch: 'Nuwara Eliya',
      account: '8945201233',
    },
    dayRate: 500,
    dayOtRate: 750,
    nightRate: 600,
    nightOtRate: 900,
    hasLogin: true,
    lastUpdatedBy: 'A. Bandara',
    lastUpdatedOn: '2026-07-10',
  },
  {
    name: 'N. Silva',
    nic: '199523456789',
    dob: '1995-08-03',
    contact: '0719876543',
    address: 'No. 5, Lake View, Nuwara Eliya',
    role: 'Machine Operator',
    department: 'Factory Floor',
    hireDate: '2023-11-01',
    employmentType: 'Permanent',
    status: 'Active',
    bank: { bank: "People's Bank", branch: 'Kandy', account: '1002458800' },
    dayRate: 400,
    dayOtRate: 600,
    nightRate: 480,
    nightOtRate: 720,
    hasLogin: false,
  },
  {
    name: 'S. Fernando',
    nic: '198834567890',
    dob: '1988-01-22',
    contact: '0761112223',
    address: 'No. 88, Hill St, Nuwara Eliya',
    role: 'Factory Officer',
    department: 'Operations',
    hireDate: '2022-06-15',
    employmentType: 'Permanent',
    status: 'Active',
    bank: {
      bank: 'Commercial Bank',
      branch: 'Nuwara Eliya',
      account: '7781234509',
    },
    dayRate: 500,
    dayOtRate: 750,
    nightRate: 600,
    nightOtRate: 900,
    hasLogin: true,
  },
  {
    name: 'T. Rajapaksa',
    nic: '199245678901',
    dob: '1992-11-30',
    contact: '0784445556',
    address: 'No. 12, Station Rd, Hatton',
    role: 'Driver',
    department: 'Logistics',
    hireDate: '2025-01-20',
    employmentType: 'Contract',
    status: 'Active',
    // Missing bank details — excluded from payroll processing until added (mirrors UC-054).
    bank: { bank: '', branch: '', account: '' },
    dayRate: 350,
    dayOtRate: 525,
    nightRate: 420,
    nightOtRate: 630,
    hasLogin: false,
  },
  {
    name: 'M. Gunawardena',
    nic: '199678901234',
    dob: '1996-03-18',
    contact: '0723334445',
    address: 'No. 44, Garden Rd, Kandy',
    role: 'Factory Manager',
    department: 'Management',
    hireDate: '2021-09-05',
    employmentType: 'Permanent',
    status: 'Active',
    bank: { bank: 'Sampath Bank', branch: 'Kandy', account: '1122334455' },
    dayRate: 700,
    dayOtRate: 1050,
    nightRate: 840,
    nightOtRate: 1260,
    hasLogin: true,
  },
  {
    name: 'D. Wijesinghe',
    nic: '199156789012',
    dob: '1991-07-09',
    contact: '0705556667',
    address: 'No. 9, Mill Lane, Nuwara Eliya',
    role: 'Machine Operator',
    department: 'Factory Floor',
    hireDate: '2020-02-14',
    employmentType: 'Permanent',
    // Suspended — generatePayroll skips non-Active employees, so no attendance is seeded for him.
    status: 'Suspended',
    bank: {
      bank: 'Hatton National Bank',
      branch: 'Hatton',
      account: '5566778899',
    },
    dayRate: 400,
    dayOtRate: 600,
    nightRate: 480,
    nightOtRate: 720,
    hasLogin: false,
  },
];

interface SeedSalaryAdvance {
  id: string;
  employeeName: string;
  amount: number;
  reason: string;
  dateRequested: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  deducted: boolean;
  decidedBy?: string;
  decidedOn?: string;
}

// Mirrors the portal's former ADVANCES fixture 1:1, plus `deducted` (new —
// tracks whether an Approved advance has already reduced a processed payroll
// run, kept separate from the approval-workflow `status`).
const SALARY_ADVANCE_SEEDS: SeedSalaryAdvance[] = [
  {
    id: 'EMP-ADV-0231',
    employeeName: 'S. Fernando',
    amount: 15000,
    reason: 'Medical expenses',
    dateRequested: '2026-07-10',
    status: 'Pending',
    deducted: false,
  },
  {
    id: 'EMP-ADV-0230',
    employeeName: 'K. Perera',
    amount: 20000,
    reason: 'School fees',
    dateRequested: '2026-07-08',
    status: 'Approved',
    deducted: false,
    decidedBy: 'A. Bandara',
    decidedOn: '2026-07-09',
  },
  {
    id: 'EMP-ADV-0229',
    employeeName: 'N. Silva',
    amount: 8000,
    reason: 'Family event',
    dateRequested: '2026-07-05',
    status: 'Rejected',
    deducted: false,
    decidedBy: 'A. Bandara',
    decidedOn: '2026-07-06',
  },
];

interface SeedAttendance {
  employeeName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Half-day';
  dayHours: number;
  dayOtHours: number;
  nightHours: number;
  nightOtHours: number;
}

function presentDays(employeeName: string, dates: string[]): SeedAttendance[] {
  return dates.map((date) => ({
    employeeName,
    date,
    status: 'Present' as const,
    dayHours: 8,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  }));
}

const PAYROLL_PERIOD = 'July 2026';

// Enough July 2026 rows per Active employee to make payroll generation
// non-trivial: a run of Present days, one day exercising the OT bucket, one
// exercising night/night-OT, and one each Absent/Leave/Half-day for variety.
const ATTENDANCE_SEEDS: SeedAttendance[] = [
  ...presentDays('K. Perera', [
    '2026-07-01',
    '2026-07-02',
    '2026-07-03',
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
    '2026-07-09',
  ]),
  {
    employeeName: 'K. Perera',
    date: '2026-07-10',
    status: 'Present',
    dayHours: 8,
    dayOtHours: 3,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'K. Perera',
    date: '2026-07-13',
    status: 'Present',
    dayHours: 0,
    dayOtHours: 0,
    nightHours: 8,
    nightOtHours: 2,
  },
  {
    employeeName: 'K. Perera',
    date: '2026-07-14',
    status: 'Absent',
    dayHours: 0,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'K. Perera',
    date: '2026-07-15',
    status: 'Leave',
    dayHours: 0,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'K. Perera',
    date: '2026-07-16',
    status: 'Half-day',
    dayHours: 4,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },

  ...presentDays('N. Silva', [
    '2026-07-01',
    '2026-07-02',
    '2026-07-03',
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
    '2026-07-09',
    '2026-07-10',
  ]),
  {
    employeeName: 'N. Silva',
    date: '2026-07-13',
    status: 'Present',
    dayHours: 8,
    dayOtHours: 2,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'N. Silva',
    date: '2026-07-14',
    status: 'Absent',
    dayHours: 0,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'N. Silva',
    date: '2026-07-15',
    status: 'Half-day',
    dayHours: 4,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },

  ...presentDays('S. Fernando', [
    '2026-07-01',
    '2026-07-02',
    '2026-07-03',
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
    '2026-07-09',
  ]),
  {
    employeeName: 'S. Fernando',
    date: '2026-07-10',
    status: 'Present',
    dayHours: 8,
    dayOtHours: 1,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'S. Fernando',
    date: '2026-07-13',
    status: 'Present',
    dayHours: 0,
    dayOtHours: 0,
    nightHours: 8,
    nightOtHours: 0,
  },
  {
    employeeName: 'S. Fernando',
    date: '2026-07-14',
    status: 'Leave',
    dayHours: 0,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },

  ...presentDays('T. Rajapaksa', [
    '2026-07-01',
    '2026-07-02',
    '2026-07-03',
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
  ]),
  {
    employeeName: 'T. Rajapaksa',
    date: '2026-07-09',
    status: 'Present',
    dayHours: 8,
    dayOtHours: 2,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'T. Rajapaksa',
    date: '2026-07-10',
    status: 'Absent',
    dayHours: 0,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'T. Rajapaksa',
    date: '2026-07-13',
    status: 'Half-day',
    dayHours: 4,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },

  ...presentDays('M. Gunawardena', [
    '2026-07-01',
    '2026-07-02',
    '2026-07-03',
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
    '2026-07-09',
    '2026-07-10',
  ]),
  {
    employeeName: 'M. Gunawardena',
    date: '2026-07-13',
    status: 'Present',
    dayHours: 8,
    dayOtHours: 2,
    nightHours: 0,
    nightOtHours: 0,
  },
  {
    employeeName: 'M. Gunawardena',
    date: '2026-07-14',
    status: 'Leave',
    dayHours: 0,
    dayOtHours: 0,
    nightHours: 0,
    nightOtHours: 0,
  },
];

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
        `INSERT INTO tea_estate_owners (user_id, name, nic, contact, email)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           name = EXCLUDED.name, nic = EXCLUDED.nic, contact = EXCLUDED.contact, email = EXCLUDED.email
         RETURNING id`,
        [ownerUserId, e.ownerName, e.nic, e.contact, e.email ?? null],
      );
      const ownerId = owner.rows[0].id;

      const estateId = await findOrCreate(
        client,
        `SELECT id FROM estates WHERE owner_id = $1 AND name = $2`,
        [ownerId, e.estateName],
        `INSERT INTO estates (owner_id, name, location) VALUES ($1, $2, $3) RETURNING id`,
        [ownerId, e.estateName, e.location],
      );
      estateIds[e.estateName] = estateId;

      const routeId = routeIds[e.route] ?? null;
      await client.query(
        `UPDATE estates SET
           location = $2, address = $3, route_id = $4, route_name = $5,
           self_delivery = $6, status = $7, ytd_deliveries_kg = $8,
           bank_name = $9, bank_branch = $10, bank_account = $11,
           last_updated_by = $12, last_updated_on = $13
         WHERE id = $1`,
        [
          estateId,
          e.location,
          e.address,
          routeId,
          e.route,
          e.selfDelivery,
          e.status,
          e.ytdDeliveriesKg,
          e.bank.bank || null,
          e.bank.branch || null,
          e.bank.account || null,
          e.lastUpdatedBy ?? null,
          e.lastUpdatedOn ?? null,
        ],
      );

      for (const doc of e.documents) {
        const existing = await client.query(
          `SELECT id FROM estate_documents WHERE estate_id = $1 AND name = $2`,
          [estateId, doc.name],
        );
        if (!existing.rows[0]) {
          await client.query(
            `INSERT INTO estate_documents (estate_id, name, uploaded_on) VALUES ($1, $2, $3)`,
            [estateId, doc.name, doc.uploadedOn],
          );
        }
      }
    }

    console.log(
      `Seeded ${ESTATE_SEEDS.length} estates (with owners, documents)`,
    );

    for (const a of ADVANCE_SEEDS) {
      await client.query(
        `INSERT INTO estate_advances
           (id, estate_id, estate_name, amount, reason, date_issued, issued_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           estate_id = EXCLUDED.estate_id, estate_name = EXCLUDED.estate_name,
           amount = EXCLUDED.amount, reason = EXCLUDED.reason,
           date_issued = EXCLUDED.date_issued, issued_by = EXCLUDED.issued_by,
           status = EXCLUDED.status`,
        [
          a.id,
          estateIds[a.estateName],
          a.estateName,
          a.amount,
          a.reason,
          a.dateIssued,
          a.issuedBy,
          a.status,
        ],
      );
    }
    console.log(`Seeded ${ADVANCE_SEEDS.length} estate advances`);

    for (const s of SETTLEMENT_SEEDS) {
      await client.query(
        `INSERT INTO settlements
           (id, estate_id, estate_name, period, super_kg, normal_kg, super_rate, normal_rate,
            transport_cost, fertilizer_deduction, advance_deduction, status, self_delivery,
            missing_bank, processed_by, processed_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           estate_id = EXCLUDED.estate_id, estate_name = EXCLUDED.estate_name,
           period = EXCLUDED.period, super_kg = EXCLUDED.super_kg, normal_kg = EXCLUDED.normal_kg,
           super_rate = EXCLUDED.super_rate, normal_rate = EXCLUDED.normal_rate,
           transport_cost = EXCLUDED.transport_cost,
           fertilizer_deduction = EXCLUDED.fertilizer_deduction,
           advance_deduction = EXCLUDED.advance_deduction, status = EXCLUDED.status,
           self_delivery = EXCLUDED.self_delivery, missing_bank = EXCLUDED.missing_bank,
           processed_by = EXCLUDED.processed_by, processed_on = EXCLUDED.processed_on`,
        [
          s.id,
          estateIds[s.estateName],
          s.estateName,
          s.period,
          s.superKg,
          s.normalKg,
          s.superRate,
          s.normalRate,
          s.transportCost,
          s.fertilizerDeduction,
          s.advanceDeduction,
          s.status,
          s.selfDelivery,
          s.missingBank ?? false,
          s.processedBy ?? null,
          s.processedOn ?? null,
        ],
      );
    }
    console.log(`Seeded ${SETTLEMENT_SEEDS.length} settlements`);

    // ── Employees + Payroll (EMP-01..14) ──

    const employeeIds: Record<string, number> = {};
    for (const e of EMPLOYEE_SEEDS) {
      const employeeId = await findOrCreate(
        client,
        `SELECT id FROM employees WHERE nic = $1`,
        [e.nic],
        `INSERT INTO employees (nic, name, role) VALUES ($1, $2, $3) RETURNING id`,
        [e.nic, e.name, e.role],
      );
      employeeIds[e.name] = employeeId;

      await client.query(
        `UPDATE employees SET
           name = $2, dob = $3, contact = $4, address = $5, role = $6, department = $7,
           hire_date = $8, employment_type = $9, status = $10,
           bank_name = $11, bank_branch = $12, bank_account = $13,
           day_rate = $14, day_ot_rate = $15, night_rate = $16, night_ot_rate = $17,
           has_login = $18, last_updated_by = $19, last_updated_on = $20
         WHERE id = $1`,
        [
          employeeId,
          e.name,
          e.dob,
          e.contact,
          e.address,
          e.role,
          e.department,
          e.hireDate,
          e.employmentType,
          e.status,
          e.bank.bank || null,
          e.bank.branch || null,
          e.bank.account || null,
          e.dayRate,
          e.dayOtRate,
          e.nightRate,
          e.nightOtRate,
          e.hasLogin,
          e.lastUpdatedBy ?? null,
          e.lastUpdatedOn ?? null,
        ],
      );
    }
    console.log(`Seeded ${EMPLOYEE_SEEDS.length} employees`);

    for (const a of ATTENDANCE_SEEDS) {
      await client.query(
        `INSERT INTO employee_attendance
           (employee_id, date, status, day_hours, day_ot_hours, night_hours, night_ot_hours, marked_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (employee_id, date) DO UPDATE SET
           status = EXCLUDED.status, day_hours = EXCLUDED.day_hours,
           day_ot_hours = EXCLUDED.day_ot_hours, night_hours = EXCLUDED.night_hours,
           night_ot_hours = EXCLUDED.night_ot_hours, marked_by = EXCLUDED.marked_by`,
        [
          employeeIds[a.employeeName],
          a.date,
          a.status,
          a.dayHours,
          a.dayOtHours,
          a.nightHours,
          a.nightOtHours,
          'S. Fernando',
        ],
      );
    }
    console.log(`Seeded ${ATTENDANCE_SEEDS.length} attendance records`);

    for (const a of SALARY_ADVANCE_SEEDS) {
      await client.query(
        `INSERT INTO salary_advances
           (id, employee_id, employee_name, amount, reason, date_requested, status, deducted, decided_by, decided_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           employee_id = EXCLUDED.employee_id, employee_name = EXCLUDED.employee_name,
           amount = EXCLUDED.amount, reason = EXCLUDED.reason,
           date_requested = EXCLUDED.date_requested, status = EXCLUDED.status,
           deducted = EXCLUDED.deducted, decided_by = EXCLUDED.decided_by,
           decided_on = EXCLUDED.decided_on`,
        [
          a.id,
          employeeIds[a.employeeName],
          a.employeeName,
          a.amount,
          a.reason,
          a.dateRequested,
          a.status,
          a.deducted,
          a.decidedBy ?? null,
          a.decidedOn ?? null,
        ],
      );
    }
    console.log(`Seeded ${SALARY_ADVANCE_SEEDS.length} salary advances`);

    // Payroll rows are computed here (aggregate attendance × rates — the same
    // formula EmployeesService.generatePayroll uses) since this script has no
    // NestJS DI context to call the real service from. Already-Processed rows
    // are left untouched by the WHERE clause on the upsert, same as the
    // service's own regeneration guard.
    let payrollCount = 0;
    for (const e of EMPLOYEE_SEEDS) {
      if (e.status !== 'Active') continue;
      const employeeId = employeeIds[e.name];

      const totals = ATTENDANCE_SEEDS.filter(
        (a) => a.employeeName === e.name,
      ).reduce(
        (sum, a) => ({
          dayHours: sum.dayHours + a.dayHours,
          dayOtHours: sum.dayOtHours + a.dayOtHours,
          nightHours: sum.nightHours + a.nightHours,
          nightOtHours: sum.nightOtHours + a.nightOtHours,
        }),
        { dayHours: 0, dayOtHours: 0, nightHours: 0, nightOtHours: 0 },
      );

      const gross =
        totals.dayHours * e.dayRate +
        totals.dayOtHours * e.dayOtRate +
        totals.nightHours * e.nightRate +
        totals.nightOtHours * e.nightOtRate;

      const deductionsAdvances = SALARY_ADVANCE_SEEDS.filter(
        (a) =>
          a.employeeName === e.name && a.status === 'Approved' && !a.deducted,
      ).reduce((sum, a) => sum + a.amount, 0);

      const missingBank = !e.bank.bank || !e.bank.branch || !e.bank.account;
      const payrollId = `PR-${String(++payrollCount).padStart(4, '0')}`;

      await client.query(
        `INSERT INTO payroll_runs
           (id, employee_id, employee_name, period, day_hours, day_ot_hours, night_hours, night_ot_hours,
            day_rate, day_ot_rate, night_rate, night_ot_rate, gross, deductions_advances,
            deductions_other, status, missing_bank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, 'Pending', $15)
         ON CONFLICT (employee_id, period) DO UPDATE SET
           day_hours = EXCLUDED.day_hours, day_ot_hours = EXCLUDED.day_ot_hours,
           night_hours = EXCLUDED.night_hours, night_ot_hours = EXCLUDED.night_ot_hours,
           day_rate = EXCLUDED.day_rate, day_ot_rate = EXCLUDED.day_ot_rate,
           night_rate = EXCLUDED.night_rate, night_ot_rate = EXCLUDED.night_ot_rate,
           gross = EXCLUDED.gross, deductions_advances = EXCLUDED.deductions_advances,
           missing_bank = EXCLUDED.missing_bank
         WHERE payroll_runs.status = 'Pending'`,
        [
          payrollId,
          employeeId,
          e.name,
          PAYROLL_PERIOD,
          totals.dayHours,
          totals.dayOtHours,
          totals.nightHours,
          totals.nightOtHours,
          e.dayRate,
          e.dayOtRate,
          e.nightRate,
          e.nightOtRate,
          gross,
          deductionsAdvances,
          missingBank,
        ],
      );
    }
    console.log(`Seeded payroll for ${PAYROLL_PERIOD}`);

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
