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
  /**
   * Added 2026-07-28 (Estate Owner Lifetime History slice) — staggered
   * 2019–2023 rather than seed time, so "Member since" and the Tenure
   * Ribbon actually have years to span. Green Valley is the flagship
   * long-tenured example (matches the addendum's own worked example).
   */
  registeredOn: string;
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
    registeredOn: '2019-03-01', // flagship long-tenured estate — the addendum's own worked example
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
    registeredOn: '2021-06-15',
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
    registeredOn: '2020-09-10',
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
    registeredOn: '2023-02-20', // youngest active estate — short tenure, thin ribbon
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
    registeredOn: '2022-05-01',
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
  // Mar–May 2026 processed history (Reports vertical slice, 2.5) — gives
  // RPT-02's revenue trend chart a real multi-point line instead of the
  // single July point the module would otherwise have. Round, illustrative
  // figures; not meant to reconcile against the July/June rows above.
  {
    id: 'SET-2026-03-001',
    estateName: 'Green Valley Estate',
    period: 'March 2026',
    superKg: 320,
    normalKg: 190,
    superRate: 175,
    normalRate: 88,
    transportCost: 7200,
    fertilizerDeduction: 9800,
    advanceDeduction: 0,
    status: 'processed',
    selfDelivery: false,
    processedBy: 'A. Bandara',
    processedOn: '2026-04-01',
  },
  {
    id: 'SET-2026-03-002',
    estateName: 'Hilltop Estate',
    period: 'March 2026',
    superKg: 105,
    normalKg: 240,
    superRate: 175,
    normalRate: 88,
    transportCost: 5600,
    fertilizerDeduction: 6100,
    advanceDeduction: 0,
    status: 'processed',
    selfDelivery: false,
    processedBy: 'A. Bandara',
    processedOn: '2026-04-01',
  },
  {
    id: 'SET-2026-04-001',
    estateName: 'Green Valley Estate',
    period: 'April 2026',
    superKg: 350,
    normalKg: 205,
    superRate: 178,
    normalRate: 90,
    transportCost: 7500,
    fertilizerDeduction: 12400,
    advanceDeduction: 0,
    status: 'processed',
    selfDelivery: false,
    processedBy: 'A. Bandara',
    processedOn: '2026-05-01',
  },
  {
    id: 'SET-2026-04-002',
    estateName: 'Mount Rest Estate',
    period: 'April 2026',
    superKg: 210,
    normalKg: 175,
    superRate: 178,
    normalRate: 90,
    transportCost: 0,
    fertilizerDeduction: 8300,
    advanceDeduction: 25000,
    status: 'processed',
    selfDelivery: true,
    processedBy: 'A. Bandara',
    processedOn: '2026-05-01',
  },
  {
    id: 'SET-2026-05-001',
    estateName: 'Green Valley Estate',
    period: 'May 2026',
    superKg: 365,
    normalKg: 190,
    superRate: 180,
    normalRate: 92,
    transportCost: 7800,
    fertilizerDeduction: 14200,
    advanceDeduction: 45000,
    status: 'processed',
    selfDelivery: false,
    processedBy: 'A. Bandara',
    processedOn: '2026-06-01',
  },
  {
    id: 'SET-2026-05-002',
    estateName: 'Hilltop Estate',
    period: 'May 2026',
    superKg: 112,
    normalKg: 260,
    superRate: 180,
    normalRate: 92,
    transportCost: 5900,
    fertilizerDeduction: 9700,
    advanceDeduction: 0,
    status: 'processed',
    selfDelivery: false,
    processedBy: 'A. Bandara',
    processedOn: '2026-06-01',
  },
  // Sparse multi-year history (Estate Owner Lifetime History slice,
  // 2026-07-28) — one settlement per year back to each estate's
  // registration, so EST-10's Tenure Ribbon and the Lifetime Summary's
  // "earned" figure span real years instead of just Mar–Jul 2026. Round,
  // illustrative rates rising year over year (matches ADM-01's own rate
  // history precedent); not meant to reconcile against the detailed rows
  // above.
  // Each row's period is safely after that estate's registeredOn (see
  // ESTATE_SEEDS above) — Mount Rest (Sep 2020), Hilltop (Jun 2021), Riverside
  // (May 2022) and Silver Peak (Feb 2023) only start appearing the year after
  // they register, avoiding a settlement that predates the relationship.
  {
    id: 'SET-2019-09-001', estateName: 'Green Valley Estate', period: 'September 2019',
    superKg: 260, normalKg: 140, superRate: 140, normalRate: 70,
    transportCost: 5200, fertilizerDeduction: 6000, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2019-10-01',
  },
  {
    id: 'SET-2020-09-001', estateName: 'Green Valley Estate', period: 'September 2020',
    superKg: 275, normalKg: 150, superRate: 148, normalRate: 74,
    transportCost: 5400, fertilizerDeduction: 6400, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2020-10-01',
  },
  {
    id: 'SET-2021-09-001', estateName: 'Green Valley Estate', period: 'September 2021',
    superKg: 290, normalKg: 160, superRate: 155, normalRate: 78,
    transportCost: 5600, fertilizerDeduction: 6900, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2021-10-01',
  },
  {
    id: 'SET-2021-09-002', estateName: 'Hilltop Estate', period: 'September 2021',
    superKg: 95, normalKg: 210, superRate: 155, normalRate: 78,
    transportCost: 5300, fertilizerDeduction: 5800, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2021-10-01',
  },
  {
    id: 'SET-2021-09-003', estateName: 'Mount Rest Estate', period: 'September 2021',
    superKg: 180, normalKg: 150, superRate: 155, normalRate: 78,
    transportCost: 0, fertilizerDeduction: 5100, advanceDeduction: 0,
    status: 'processed', selfDelivery: true, processedBy: 'A. Bandara', processedOn: '2021-10-01',
  },
  {
    id: 'SET-2022-09-001', estateName: 'Green Valley Estate', period: 'September 2022',
    superKg: 305, normalKg: 165, superRate: 162, normalRate: 82,
    transportCost: 5800, fertilizerDeduction: 7400, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2022-10-01',
  },
  {
    id: 'SET-2022-09-002', estateName: 'Riverside Estate', period: 'September 2022',
    superKg: 60, normalKg: 90, superRate: 162, normalRate: 82,
    transportCost: 4200, fertilizerDeduction: 3600, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2022-10-01',
  },
  {
    id: 'SET-2023-09-001', estateName: 'Green Valley Estate', period: 'September 2023',
    superKg: 320, normalKg: 172, superRate: 168, normalRate: 85,
    transportCost: 6100, fertilizerDeduction: 8100, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2023-10-01',
  },
  {
    id: 'SET-2023-09-002', estateName: 'Silver Peak Estate', period: 'September 2023',
    superKg: 80, normalKg: 0, superRate: 168, normalRate: 85,
    transportCost: 3100, fertilizerDeduction: 2900, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2023-10-01',
  },
  {
    id: 'SET-2024-09-001', estateName: 'Green Valley Estate', period: 'September 2024',
    superKg: 335, normalKg: 178, superRate: 172, normalRate: 87,
    transportCost: 6400, fertilizerDeduction: 8700, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2024-10-01',
  },
  {
    id: 'SET-2024-09-002', estateName: 'Hilltop Estate', period: 'September 2024',
    superKg: 100, normalKg: 225, superRate: 172, normalRate: 87,
    transportCost: 5700, fertilizerDeduction: 6300, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2024-10-01',
  },
  {
    id: 'SET-2025-09-001', estateName: 'Green Valley Estate', period: 'September 2025',
    superKg: 350, normalKg: 182, superRate: 178, normalRate: 90,
    transportCost: 6700, fertilizerDeduction: 9200, advanceDeduction: 0,
    status: 'processed', selfDelivery: false, processedBy: 'A. Bandara', processedOn: '2025-10-01',
  },
  {
    id: 'SET-2025-09-002', estateName: 'Mount Rest Estate', period: 'September 2025',
    superKg: 205, normalKg: 172, superRate: 178, normalRate: 90,
    transportCost: 0, fertilizerDeduction: 7900, advanceDeduction: 0,
    status: 'processed', selfDelivery: true, processedBy: 'A. Bandara', processedOn: '2025-10-01',
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

interface SeedHistoricalPayroll {
  id: string;
  employeeName: string; // resolved to employeeIds[name] at insert time
  period: string;
  gross: number;
  processedOn: string;
}

// Mar–Jun 2026 payroll history (Reports vertical slice, 2.5) — real
// `generatePayroll` only ever runs for `PAYROLL_PERIOD` (July), so these are
// inserted directly (same "static row, not computed" precedent as the
// historical `SETTLEMENT_SEEDS` rows above) purely to give RPT-03's expense
// trend a real multi-point line. One representative row per month rather
// than one per employee — illustrative magnitude, not a full payroll run.
const HISTORICAL_PAYROLL_SEEDS: SeedHistoricalPayroll[] = [
  { id: 'PR-HIST-2026-03', employeeName: 'N. Silva', period: 'March 2026', gross: 68000, processedOn: '2026-04-01' },
  { id: 'PR-HIST-2026-04', employeeName: 'N. Silva', period: 'April 2026', gross: 71500, processedOn: '2026-05-01' },
  { id: 'PR-HIST-2026-05', employeeName: 'N. Silva', period: 'May 2026', gross: 74000, processedOn: '2026-06-01' },
  { id: 'PR-HIST-2026-06', employeeName: 'N. Silva', period: 'June 2026', gross: 76500, processedOn: '2026-07-01' },
];

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
  // Mar–Jun 2026 confirmed history (Reports vertical slice, 2.5) — every
  // other seeded collection record is July-dated, so RPT-01's trend chart
  // would otherwise be a single point. Minimal photos/timeline (DB defaults
  // to '[]') since these exist only to feed the aggregate, not to be opened
  // individually from COL-03.
  {
    id: 'GV-2026-0312',
    estateName: 'Green Valley Estate',
    routeName: 'Route 3',
    weightKg: 185,
    grade: 'super',
    status: 'confirmed',
    date: '2026-03-12',
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [{ status: 'Confirmed', timestamp: '2026-03-12T11:00:00', by: 'R. Jayasuriya' }],
  },
  {
    id: 'HT-2026-0318',
    estateName: 'Hilltop Estate',
    routeName: 'Route 5',
    weightKg: 132,
    grade: 'normal',
    status: 'confirmed',
    date: '2026-03-18',
    agentName: 'W. Gunaratne',
    photos: [],
    timeline: [{ status: 'Confirmed', timestamp: '2026-03-18T10:40:00', by: 'R. Jayasuriya' }],
  },
  {
    id: 'GV-2026-0409',
    estateName: 'Green Valley Estate',
    routeName: 'Route 3',
    weightKg: 198,
    grade: 'super',
    status: 'confirmed',
    date: '2026-04-09',
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [{ status: 'Confirmed', timestamp: '2026-04-09T11:15:00', by: 'R. Jayasuriya' }],
  },
  {
    id: 'MR-2026-0421',
    estateName: 'Mount Rest Estate',
    routeName: 'Route 2',
    weightKg: 210,
    grade: 'normal',
    status: 'confirmed',
    date: '2026-04-21',
    agentName: 'Self-delivered',
    photos: [],
    timeline: [{ status: 'Confirmed', timestamp: '2026-04-21T10:00:00', by: 'R. Jayasuriya' }],
  },
  {
    id: 'GV-2026-0511',
    estateName: 'Green Valley Estate',
    routeName: 'Route 3',
    weightKg: 205,
    grade: 'super',
    status: 'confirmed',
    date: '2026-05-11',
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [{ status: 'Confirmed', timestamp: '2026-05-11T11:05:00', by: 'R. Jayasuriya' }],
  },
  {
    id: 'HT-2026-0523',
    estateName: 'Hilltop Estate',
    routeName: 'Route 5',
    weightKg: 148,
    grade: 'normal',
    status: 'confirmed',
    date: '2026-05-23',
    agentName: 'W. Gunaratne',
    photos: [],
    timeline: [{ status: 'Confirmed', timestamp: '2026-05-23T10:50:00', by: 'R. Jayasuriya' }],
  },
  {
    id: 'GV-2026-0608',
    estateName: 'Green Valley Estate',
    routeName: 'Route 3',
    weightKg: 220,
    grade: 'super',
    status: 'confirmed',
    date: '2026-06-08',
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [{ status: 'Confirmed', timestamp: '2026-06-08T11:20:00', by: 'R. Jayasuriya' }],
  },
  {
    id: 'MR-2026-0619',
    estateName: 'Mount Rest Estate',
    routeName: 'Route 2',
    weightKg: 175,
    grade: 'normal',
    status: 'confirmed',
    date: '2026-06-19',
    agentName: 'Self-delivered',
    photos: [],
    timeline: [{ status: 'Confirmed', timestamp: '2026-06-19T10:10:00', by: 'R. Jayasuriya' }],
  },
  // Sparse multi-year confirmed deliveries (Estate Owner Lifetime History
  // slice, 2026-07-28) — one per settlement-year added above, so EST-10's
  // Delivery entries and the Lifetime Summary's deliveredKg/grade-split span
  // real years rather than just Mar–Jul 2026. Same minimal shape as the
  // Mar–Jun block above.
  {
    id: 'GV-2019-0905', estateName: 'Green Valley Estate', routeName: 'Route 3',
    weightKg: 260, grade: 'super', status: 'confirmed', date: '2019-09-05', agentName: 'R. Senanayake',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2019-09-05T11:00:00', by: 'A. Bandara' }],
  },
  {
    id: 'GV-2020-0906', estateName: 'Green Valley Estate', routeName: 'Route 3',
    weightKg: 275, grade: 'super', status: 'confirmed', date: '2020-09-06', agentName: 'R. Senanayake',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2020-09-06T11:00:00', by: 'A. Bandara' }],
  },
  {
    id: 'GV-2021-0907', estateName: 'Green Valley Estate', routeName: 'Route 3',
    weightKg: 290, grade: 'super', status: 'confirmed', date: '2021-09-07', agentName: 'R. Senanayake',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2021-09-07T11:00:00', by: 'A. Bandara' }],
  },
  {
    id: 'HT-2021-0908', estateName: 'Hilltop Estate', routeName: 'Route 5',
    weightKg: 210, grade: 'normal', status: 'confirmed', date: '2021-09-08', agentName: 'W. Gunaratne',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2021-09-08T10:40:00', by: 'A. Bandara' }],
  },
  {
    id: 'MR-2021-0909', estateName: 'Mount Rest Estate', routeName: 'Route 2',
    weightKg: 180, grade: 'normal', status: 'confirmed', date: '2021-09-09', agentName: 'Self-delivered',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2021-09-09T10:00:00', by: 'A. Bandara' }],
  },
  {
    id: 'GV-2022-0910', estateName: 'Green Valley Estate', routeName: 'Route 3',
    weightKg: 305, grade: 'super', status: 'confirmed', date: '2022-09-10', agentName: 'R. Senanayake',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2022-09-10T11:00:00', by: 'A. Bandara' }],
  },
  {
    id: 'RV-2022-0911', estateName: 'Riverside Estate', routeName: 'Route 2',
    weightKg: 90, grade: 'normal', status: 'confirmed', date: '2022-09-11', agentName: 'W. Gunaratne',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2022-09-11T10:15:00', by: 'A. Bandara' }],
  },
  {
    id: 'GV-2023-0912', estateName: 'Green Valley Estate', routeName: 'Route 3',
    weightKg: 320, grade: 'super', status: 'confirmed', date: '2023-09-12', agentName: 'R. Senanayake',
    // A mismatch example in the older history too, so the disputes rollup
    // (§11 item 33) isn't only exercised by whatever's in the July fixture.
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2023-09-12T11:00:00', by: 'A. Bandara' }],
    mismatch: { complaintId: 'C-2023-001', note: 'Owner reported 330 kg at pickup; agent recorded 320 kg.' },
  },
  {
    id: 'SP-2023-0913', estateName: 'Silver Peak Estate', routeName: 'Route 3',
    weightKg: 80, grade: 'super', status: 'confirmed', date: '2023-09-13', agentName: 'R. Senanayake',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2023-09-13T11:20:00', by: 'A. Bandara' }],
  },
  {
    id: 'GV-2024-0914', estateName: 'Green Valley Estate', routeName: 'Route 3',
    weightKg: 335, grade: 'super', status: 'confirmed', date: '2024-09-14', agentName: 'R. Senanayake',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2024-09-14T11:00:00', by: 'A. Bandara' }],
  },
  {
    id: 'HT-2024-0915', estateName: 'Hilltop Estate', routeName: 'Route 5',
    weightKg: 225, grade: 'normal', status: 'confirmed', date: '2024-09-15', agentName: 'W. Gunaratne',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2024-09-15T10:40:00', by: 'A. Bandara' }],
  },
  {
    id: 'GV-2025-0916', estateName: 'Green Valley Estate', routeName: 'Route 3',
    weightKg: 350, grade: 'super', status: 'confirmed', date: '2025-09-16', agentName: 'R. Senanayake',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2025-09-16T11:00:00', by: 'A. Bandara' }],
  },
  {
    id: 'MR-2025-0917', estateName: 'Mount Rest Estate', routeName: 'Route 2',
    weightKg: 205, grade: 'normal', status: 'confirmed', date: '2025-09-17', agentName: 'Self-delivered',
    photos: [], timeline: [{ status: 'Confirmed', timestamp: '2025-09-17T10:00:00', by: 'A. Bandara' }],
  },
];

// ── Fertilizer (FERT-01..08) ──
// Mirrors the portal's former `features/fertilizer/data.ts` fixture 1:1 —
// figures drawn from the addendum's §5.2 example, notably TSP available =
// −200 kg (500 on hand − 700 committed). Per-item on-hand: Urea 1,200 ·
// TSP 500 (FB-2260 excluded, expired) · MOP 300 · Dolomite 800 · Rice 1,500.

interface SeedBatch {
  item: string;
  category: 'Fertilizer' | 'Beneficiary';
  quantityKg: number;
  unit: 'kg' | 'bags';
  receivedDate: string;
  expiryDate: string;
  location: string;
  supplier: string;
  lotNumber: string;
  qualityNotes?: string;
  discarded?: boolean;
}

const BATCH_SEEDS: SeedBatch[] = [
  {
    item: 'Urea Fertilizer',
    category: 'Fertilizer',
    quantityKg: 700,
    unit: 'kg',
    receivedDate: '2026-06-01',
    expiryDate: '2026-12-01',
    location: 'Warehouse A',
    supplier: 'CIC Agri Businesses',
    lotNumber: 'LOT-U-4471',
    qualityNotes: 'Sealed 50 kg bags, dry storage.',
  },
  {
    item: 'Urea Fertilizer',
    category: 'Fertilizer',
    quantityKg: 500,
    unit: 'kg',
    receivedDate: '2026-06-20',
    expiryDate: '2026-11-15',
    location: 'Warehouse A',
    supplier: 'CIC Agri Businesses',
    lotNumber: 'LOT-U-4490',
  },
  {
    item: 'TSP',
    category: 'Fertilizer',
    quantityKg: 500,
    unit: 'kg',
    receivedDate: '2026-05-30',
    expiryDate: '2026-10-10',
    location: 'Warehouse A',
    supplier: 'Hayleys Agriculture',
    lotNumber: 'LOT-T-2201',
  },
  {
    // Past expiry — excluded from on-hand (the FEFO/expiry-alerts showcase row).
    item: 'TSP',
    category: 'Fertilizer',
    quantityKg: 120,
    unit: 'kg',
    receivedDate: '2026-01-10',
    expiryDate: '2026-07-04',
    location: 'Warehouse B',
    supplier: 'Hayleys Agriculture',
    lotNumber: 'LOT-T-1180',
    qualityNotes: 'Past expiry — pending disposal.',
  },
  {
    item: 'Muriate of Potash',
    category: 'Fertilizer',
    quantityKg: 300,
    unit: 'kg',
    receivedDate: '2026-05-10',
    expiryDate: '2026-08-10',
    location: 'Warehouse B',
    supplier: 'CIC Agri Businesses',
    lotNumber: 'LOT-M-3350',
  },
  {
    item: 'Dolomite',
    category: 'Fertilizer',
    quantityKg: 500,
    unit: 'kg',
    receivedDate: '2026-06-02',
    expiryDate: '2026-08-16',
    location: 'Warehouse B',
    supplier: 'Lanka Minerals',
    lotNumber: 'LOT-D-0921',
    qualityNotes:
      'Bags show minor moisture on outer layer — inspect before dispatch.',
  },
  {
    item: 'Dolomite',
    category: 'Fertilizer',
    quantityKg: 300,
    unit: 'kg',
    receivedDate: '2026-06-25',
    expiryDate: '2026-11-01',
    location: 'Warehouse B',
    supplier: 'Lanka Minerals',
    lotNumber: 'LOT-D-0955',
  },
  {
    // Beneficiary item, not fertilizer proper — same batch/movement model (addendum §11.25).
    item: 'Rice',
    category: 'Beneficiary',
    quantityKg: 1500,
    unit: 'kg',
    receivedDate: '2026-07-01',
    expiryDate: '2027-03-01',
    location: 'Warehouse C',
    supplier: 'Govt Beneficiary Supply',
    lotNumber: 'LOT-R-7781',
  },
  // Historical placeholder lot (Estate Owner Lifetime History slice,
  // 2026-07-28) — exists only so the priced multi-year dispatches below have
  // a batch row to reference; this seed script doesn't decrement a batch's
  // on-hand kg from its movement ledger (same snapshot-vs-ledger split every
  // other batch here already has), so its quantity is nominal.
  {
    item: 'Urea Fertilizer',
    category: 'Fertilizer',
    quantityKg: 0,
    unit: 'kg',
    receivedDate: '2019-01-01',
    expiryDate: '2099-01-01',
    location: 'Warehouse A',
    supplier: 'CIC Agri Businesses',
    lotNumber: 'LOT-HIST-0001',
    qualityNotes: 'Historical placeholder for pre-2026 dispatch records.',
  },
];

interface SeedFertilizerRequest {
  estateName: string;
  item: string;
  quantityKg: number;
  origin: 'mobile' | 'web';
  status:
    | 'Submitted'
    | 'Approved'
    | 'Partially Dispatched'
    | 'Dispatched'
    | 'Deducted'
    | 'Rejected'
    | 'Cancelled';
  reason?: string;
  approvedQtyKg?: number;
  dispatchedQtyKg?: number;
  decidedBy?: string;
}

// `quantityKg` is unique per (estate, item) below, so that triple doubles as
// this fixture's natural key for idempotent re-seeding (fertilizer_requests
// has no business-key column — see init.sql).
const FERTILIZER_REQUEST_SEEDS: SeedFertilizerRequest[] = [
  {
    estateName: 'Green Valley Estate',
    item: 'Urea Fertilizer',
    quantityKg: 400,
    origin: 'mobile',
    status: 'Approved',
    approvedQtyKg: 400,
    decidedBy: 'A. Bandara',
  },
  {
    estateName: 'Hilltop Estate',
    item: 'TSP',
    quantityKg: 400,
    origin: 'mobile',
    status: 'Approved',
    approvedQtyKg: 400,
    decidedBy: 'A. Bandara',
  },
  {
    estateName: 'Mount Rest Estate',
    item: 'TSP',
    quantityKg: 300,
    origin: 'mobile',
    status: 'Approved',
    approvedQtyKg: 300,
    decidedBy: 'A. Bandara',
  },
  {
    estateName: 'Silver Peak Estate',
    item: 'Muriate of Potash',
    quantityKg: 100,
    origin: 'web',
    status: 'Approved',
    approvedQtyKg: 100,
    decidedBy: 'A. Bandara',
  },
  {
    estateName: 'Green Valley Estate',
    item: 'Rice',
    quantityKg: 250,
    origin: 'mobile',
    status: 'Approved',
    approvedQtyKg: 250,
    decidedBy: 'A. Bandara',
  },
  {
    estateName: 'Green Valley Estate',
    item: 'Urea Fertilizer',
    quantityKg: 300,
    origin: 'mobile',
    status: 'Submitted',
    reason: 'Top dressing for the new flush.',
  },
  {
    estateName: 'Hilltop Estate',
    item: 'TSP',
    quantityKg: 200,
    origin: 'mobile',
    status: 'Submitted',
    reason: 'Base fertiliser, lower field.',
  },
  {
    estateName: 'Mount Rest Estate',
    item: 'Muriate of Potash',
    quantityKg: 400,
    origin: 'web',
    status: 'Submitted',
    reason: 'Phoned in — potassium deficiency flagged by manager.',
  },
  {
    estateName: 'Silver Peak Estate',
    item: 'Rice',
    quantityKg: 100,
    origin: 'mobile',
    status: 'Submitted',
    reason: 'Monthly beneficiary ration.',
  },
  {
    estateName: 'Mount Rest Estate',
    item: 'Urea Fertilizer',
    quantityKg: 120,
    origin: 'mobile',
    status: 'Dispatched',
    approvedQtyKg: 120,
    dispatchedQtyKg: 120,
    decidedBy: 'A. Bandara',
  },
  {
    estateName: 'Silver Peak Estate',
    item: 'TSP',
    quantityKg: 300,
    origin: 'web',
    status: 'Rejected',
    reason: 'Duplicate of an earlier request.',
    decidedBy: 'A. Bandara',
  },
];

interface SeedMovement {
  lotNumber: string;
  type: 'Incoming' | 'Outgoing';
  quantityKg: number;
  date: string;
  destination?: string;
  linkedRequest?: { estateName: string; item: string; quantityKg: number };
  supplier?: string;
  notes?: string;
  recordedBy: string;
  /**
   * Estate Owner Lifetime History slice — the structured billing link
   * (`stock_movements.estate_id`) plus the rate that, together, produce a
   * `fertilizer_charges` row. Omit either to leave the dispatch unbilled,
   * same as the live `recordOutgoing` write path.
   */
  estateName?: string;
  ratePerKg?: number;
  /** When set, this charge is already recovered (a processed settlement's id). Omit = outstanding. */
  recoveredBySettlement?: string;
}

const MOVEMENT_SEEDS: SeedMovement[] = [
  {
    lotNumber: 'LOT-U-4471',
    type: 'Incoming',
    quantityKg: 700,
    date: '2026-06-01',
    supplier: 'CIC Agri Businesses',
    recordedBy: 'S. Fernando',
  },
  {
    lotNumber: 'LOT-U-4471',
    type: 'Outgoing',
    quantityKg: 120,
    date: '2026-06-29',
    destination: 'Mount Rest Estate',
    linkedRequest: {
      estateName: 'Mount Rest Estate',
      item: 'Urea Fertilizer',
      quantityKg: 120,
    },
    recordedBy: 'S. Fernando',
  },
  {
    lotNumber: 'LOT-T-2201',
    type: 'Incoming',
    quantityKg: 500,
    date: '2026-05-30',
    supplier: 'Hayleys Agriculture',
    recordedBy: 'A. Bandara',
  },
  {
    lotNumber: 'LOT-D-0921',
    type: 'Incoming',
    quantityKg: 500,
    date: '2026-06-02',
    supplier: 'Lanka Minerals',
    recordedBy: 'S. Fernando',
  },
  {
    lotNumber: 'LOT-M-3350',
    type: 'Incoming',
    quantityKg: 300,
    date: '2026-05-10',
    supplier: 'CIC Agri Businesses',
    recordedBy: 'A. Bandara',
  },
  {
    lotNumber: 'LOT-R-7781',
    type: 'Incoming',
    quantityKg: 1500,
    date: '2026-07-01',
    supplier: 'Govt Beneficiary Supply',
    recordedBy: 'S. Fernando',
  },
  // Sparse multi-year priced dispatches (Estate Owner Lifetime History slice,
  // 2026-07-28), against the LOT-HIST-0001 placeholder batch — these are
  // what give EST-10's Fertilizer entries and the Lifetime Summary's
  // Outstanding panel real, multi-year figures. Most recover at that year's
  // September settlement (see SETTLEMENT_SEEDS above); the most recent one
  // is left outstanding on purpose, so a real owner shows a non-zero
  // Outstanding panel rather than every seeded estate reading "Fully
  // settled".
  {
    lotNumber: 'LOT-HIST-0001', type: 'Outgoing', quantityKg: 60, date: '2020-09-01',
    destination: 'Green Valley Estate', estateName: 'Green Valley Estate',
    ratePerKg: 68, recoveredBySettlement: 'SET-2020-09-001', recordedBy: 'A. Bandara',
  },
  {
    lotNumber: 'LOT-HIST-0001', type: 'Outgoing', quantityKg: 70, date: '2021-09-01',
    destination: 'Green Valley Estate', estateName: 'Green Valley Estate',
    ratePerKg: 72, recoveredBySettlement: 'SET-2021-09-001', recordedBy: 'A. Bandara',
  },
  {
    lotNumber: 'LOT-HIST-0001', type: 'Outgoing', quantityKg: 55, date: '2021-09-02',
    destination: 'Hilltop Estate', estateName: 'Hilltop Estate',
    ratePerKg: 72, recoveredBySettlement: 'SET-2021-09-002', recordedBy: 'A. Bandara',
  },
  {
    lotNumber: 'LOT-HIST-0001', type: 'Outgoing', quantityKg: 65, date: '2022-09-01',
    destination: 'Green Valley Estate', estateName: 'Green Valley Estate',
    ratePerKg: 78, recoveredBySettlement: 'SET-2022-09-001', recordedBy: 'A. Bandara',
  },
  {
    lotNumber: 'LOT-HIST-0001', type: 'Outgoing', quantityKg: 75, date: '2023-09-01',
    destination: 'Green Valley Estate', estateName: 'Green Valley Estate',
    ratePerKg: 82, recoveredBySettlement: 'SET-2023-09-001', recordedBy: 'A. Bandara',
  },
  {
    lotNumber: 'LOT-HIST-0001', type: 'Outgoing', quantityKg: 80, date: '2024-09-01',
    destination: 'Green Valley Estate', estateName: 'Green Valley Estate',
    ratePerKg: 85, recoveredBySettlement: 'SET-2024-09-001', recordedBy: 'A. Bandara',
  },
  {
    lotNumber: 'LOT-HIST-0001', type: 'Outgoing', quantityKg: 90, date: '2025-09-01',
    destination: 'Green Valley Estate', estateName: 'Green Valley Estate',
    ratePerKg: 90, recordedBy: 'A. Bandara', // left outstanding on purpose — see comment above
  },
];

interface SeedExpenseEntry {
  id: string;
  category: 'Utilities' | 'Maintenance' | 'Miscellaneous' | 'Other';
  description: string;
  amount: number;
  date: string;
  enteredBy: string;
}

// ── Reports (RPT-01..04) ──
// Manual daily-expense entries — mirrors the portal's former
// `features/reports/data.ts` EXPENSE_ROWS fixture's manual rows 1:1. The
// Payroll/Fertilizer/Transport lines the fixture also showed are DERIVED
// from `payroll_runs`/`settlements` at query time (`ReportsService`), never
// stored here.
const EXPENSE_ENTRY_SEEDS: SeedExpenseEntry[] = [
  {
    id: 'EXP-2026-0136',
    category: 'Utilities',
    description: 'CEB electricity — factory floor',
    amount: 214600,
    date: '2026-07-10',
    enteredBy: 'S. Fernando',
  },
  {
    id: 'EXP-2026-0133',
    category: 'Maintenance',
    description: 'Withering trough fan replacement',
    amount: 86500,
    date: '2026-07-07',
    enteredBy: 'S. Fernando',
  },
  {
    id: 'EXP-2026-0130',
    category: 'Miscellaneous',
    description: 'Factory floor cleaning supplies',
    amount: 12475,
    date: '2026-07-03',
    enteredBy: 'S. Fernando',
  },
  // A little history so RPT-03's trend line isn't flat before July.
  {
    id: 'EXP-2026-0089',
    category: 'Utilities',
    description: 'CEB electricity — factory floor',
    amount: 198200,
    date: '2026-06-09',
    enteredBy: 'S. Fernando',
  },
  {
    id: 'EXP-2026-0052',
    category: 'Maintenance',
    description: 'Dryer belt servicing',
    amount: 64200,
    date: '2026-05-14',
    enteredBy: 'S. Fernando',
  },
];

// ── Administration (ADM-01..04) ──
// role_permissions is seeded from the portal's DEFAULT_PERMISSIONS (src/context/
// permissions.ts) — the backend is now the source of truth and the client
// constant is only a fallback. grade_rates mirror the ADM-01 fixture's version
// history; a settings baseline and a few audit rows so the pages aren't empty.

const PERMISSION_MATRIX: Record<
  'Administrator' | 'Officer' | 'Manager',
  Record<string, string>
> = {
  Administrator: {
    dashboard: 'approve', collection: 'approve', fertilizer: 'approve',
    estateOwners: 'approve', payroll: 'approve', advances: 'approve',
    employees: 'approve', attendance: 'approve', performance: 'approve',
    reports: 'approve', administration: 'approve',
  },
  Officer: {
    dashboard: 'view', collection: 'edit', fertilizer: 'edit',
    estateOwners: 'edit', payroll: 'edit', advances: 'approve',
    employees: 'view', attendance: 'edit', performance: 'view',
    reports: 'edit', administration: 'none',
  },
  Manager: {
    dashboard: 'view', collection: 'view', fertilizer: 'view',
    estateOwners: 'view', payroll: 'view', advances: 'view',
    employees: 'view', attendance: 'view', performance: 'approve',
    reports: 'view', administration: 'none',
  },
};

const GRADE_RATE_SEEDS = [
  { id: 'GR-2026-0001', superRate: 172, normalRate: 88, effectiveDate: '2026-01-01' },
  { id: 'GR-2026-0002', superRate: 180, normalRate: 92, effectiveDate: '2026-04-01' },
  { id: 'GR-2026-0003', superRate: 185, normalRate: 95, effectiveDate: '2026-07-01' },
];

const SETTING_SEEDS: { key: string; value: unknown }[] = [
  {
    key: 'notifications',
    value: {
      'route-assigned': true,
      'advance-approved': true,
      'fertilizer-expiry': true,
      'payment-processed': true,
      'weight-mismatch': true,
    },
  },
  { key: 'defaultChannel', value: 'in-app' },
  { key: 'sessionTimeout', value: '30' },
  { key: 'passwordPolicy', value: 'standard' },
];

const AUDIT_LOG_SEEDS = [
  { id: 'AUD-00001', createdAt: '2026-07-01T09:15:00', userName: 'A. Bandara', role: 'Administrator', action: 'Processed settlement run', module: 'Estate Owner', record: 'June 2026', recordHref: '/estates/settlements', details: 'Rs. 1,207,464 across 2 estates' },
  { id: 'AUD-00002', createdAt: '2026-07-05T10:02:00', userName: 'S. Fernando', role: 'Officer', action: 'Issued advance Rs. 50000', module: 'Estate Owner', record: 'EADV-2026-0031', recordHref: '/estates/EST-0001', details: 'Green Valley Estate — pre-season labour' },
  { id: 'AUD-00003', createdAt: '2026-07-12T14:18:00', userName: 'S. Fernando', role: 'Officer', action: 'Logged outgoing stock movement', module: 'Fertilizer', record: 'FB-2291', recordHref: '/fertilizer', details: '60 kg Urea' },
  { id: 'AUD-00004', createdAt: '2026-07-15T11:30:00', userName: 'A. Bandara', role: 'Administrator', action: 'Processed payroll run', module: 'Employee', record: 'July 2026', recordHref: '/employees/payroll', details: '27 employees' },
  { id: 'AUD-00005', createdAt: '2026-07-17T15:44:00', userName: 'A. Bandara', role: 'Administrator', action: 'Updated grade rates', module: 'Administration', record: 'Rates effective 2026-07-01', details: 'Super Rs. 185/kg · Normal Rs. 95/kg' },
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
    const estateOwnerIds: Record<string, number> = {};
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
      estateOwnerIds[e.estateName] = ownerId;

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
           last_updated_by = $12, last_updated_on = $13, registered_on = $14
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
          e.registeredOn,
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

    for (const h of HISTORICAL_PAYROLL_SEEDS) {
      await client.query(
        `INSERT INTO payroll_runs
           (id, employee_id, employee_name, period, gross, status, missing_bank,
            processed_by, processed_on)
         VALUES ($1, $2, $3, $4, $5, 'Processed', false, 'A. Bandara', $6)
         ON CONFLICT (employee_id, period) DO UPDATE SET
           gross = EXCLUDED.gross, status = EXCLUDED.status`,
        [
          h.id,
          employeeIds[h.employeeName],
          h.employeeName,
          h.period,
          h.gross,
          h.processedOn,
        ],
      );
    }
    console.log(`Seeded ${HISTORICAL_PAYROLL_SEEDS.length} historical payroll rows`);

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

    // ── Fertilizer (FERT-01..08) ──

    const batchIds: Record<string, number> = {}; // keyed by lot_number
    for (const b of BATCH_SEEDS) {
      const batchId = await findOrCreate(
        client,
        `SELECT id FROM fertilizer_batches WHERE lot_number = $1`,
        [b.lotNumber],
        `INSERT INTO fertilizer_batches
           (item, category, quantity_kg, unit, received_date, expiry_date, location,
            supplier, lot_number, quality_notes, discarded, last_updated_by, last_updated_on)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
          b.item,
          b.category,
          b.quantityKg,
          b.unit,
          b.receivedDate,
          b.expiryDate,
          b.location,
          b.supplier,
          b.lotNumber,
          b.qualityNotes ?? null,
          b.discarded ?? false,
          'S. Fernando',
          new Date(),
        ],
      );
      batchIds[b.lotNumber] = batchId;

      await client.query(
        `UPDATE fertilizer_batches SET
           item = $2, category = $3, quantity_kg = $4, unit = $5, received_date = $6,
           expiry_date = $7, location = $8, supplier = $9, quality_notes = $10, discarded = $11
         WHERE id = $1`,
        [
          batchId,
          b.item,
          b.category,
          b.quantityKg,
          b.unit,
          b.receivedDate,
          b.expiryDate,
          b.location,
          b.supplier,
          b.qualityNotes ?? null,
          b.discarded ?? false,
        ],
      );
    }
    console.log(`Seeded ${BATCH_SEEDS.length} fertilizer batches`);

    // Keyed by (estate, item, original quantity) — unique across this fixture
    // set, so it doubles as a natural key since fertilizer_requests has no
    // business-key column (see init.sql).
    const requestIds: Record<string, number> = {};
    const requestKey = (estateName: string, item: string, quantityKg: number) =>
      `${estateName}|${item}|${quantityKg}`;

    for (const r of FERTILIZER_REQUEST_SEEDS) {
      const estateId = estateIds[r.estateName];
      const ownerId = estateOwnerIds[r.estateName];
      const approvedQtyKg =
        r.approvedQtyKg ??
        (r.status === 'Approved' ||
        r.status === 'Dispatched' ||
        r.status === 'Partially Dispatched'
          ? r.quantityKg
          : null);

      const requestId = await findOrCreate(
        client,
        `SELECT id FROM fertilizer_requests WHERE estate_id = $1 AND item = $2 AND quantity_kg = $3`,
        [estateId, r.item, r.quantityKg],
        `INSERT INTO fertilizer_requests
           (estate_id, owner_id, item, quantity_kg, justification, origin, status,
            approved_qty_kg, dispatched_qty_kg, decided_by, decided_on)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [
          estateId,
          ownerId,
          r.item,
          r.quantityKg,
          r.reason ?? null,
          r.origin,
          r.status,
          approvedQtyKg,
          r.dispatchedQtyKg ?? 0,
          r.decidedBy ?? null,
          r.decidedBy ? new Date() : null,
        ],
      );
      requestIds[requestKey(r.estateName, r.item, r.quantityKg)] = requestId;

      await client.query(
        `UPDATE fertilizer_requests SET
           justification = $2, origin = $3, status = $4, approved_qty_kg = $5,
           dispatched_qty_kg = $6, decided_by = $7
         WHERE id = $1`,
        [
          requestId,
          r.reason ?? null,
          r.origin,
          r.status,
          approvedQtyKg,
          r.dispatchedQtyKg ?? 0,
          r.decidedBy ?? null,
        ],
      );
    }
    console.log(
      `Seeded ${FERTILIZER_REQUEST_SEEDS.length} fertilizer requests`,
    );

    let chargeCount = 0;
    for (const m of MOVEMENT_SEEDS) {
      const batchId = batchIds[m.lotNumber];
      const linkedRequestId = m.linkedRequest
        ? requestIds[
            requestKey(
              m.linkedRequest.estateName,
              m.linkedRequest.item,
              m.linkedRequest.quantityKg,
            )
          ]
        : null;
      // Estate Owner Lifetime History slice — the structured billing link,
      // mirroring `FertilizerService.recordOutgoing`'s estate resolution
      // (a linked request's estate would win, but none of these seeds use both).
      const estateId = m.estateName ? (estateIds[m.estateName] ?? null) : null;

      const existing = await client.query<{ id: number }>(
        `SELECT id FROM stock_movements WHERE batch_id = $1 AND type = $2 AND movement_date = $3 AND quantity_kg = $4`,
        [batchId, m.type, m.date, m.quantityKg],
      );
      let movementId = existing.rows[0]?.id;
      if (!movementId) {
        const inserted = await client.query<{ id: number }>(
          `INSERT INTO stock_movements
             (batch_id, type, quantity_kg, movement_date, destination, estate_id,
              linked_request_id, supplier, notes, recorded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING id`,
          [
            batchId,
            m.type,
            m.quantityKg,
            m.date,
            m.destination ?? null,
            estateId,
            linkedRequestId,
            m.supplier ?? null,
            m.notes ?? null,
            m.recordedBy,
          ],
        );
        movementId = inserted.rows[0].id;
      }

      if (m.ratePerKg) {
        const existingCharge = await client.query(
          `SELECT id FROM fertilizer_charges WHERE stock_movement_id = $1`,
          [movementId],
        );
        if (!existingCharge.rows[0]) {
          await client.query(
            `INSERT INTO fertilizer_charges
               (stock_movement_id, estate_id, fertilizer_request_id, rate_per_kg,
                quantity_kg, total_charge, settlement_id, calculated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              movementId,
              estateId,
              linkedRequestId,
              m.ratePerKg,
              m.quantityKg,
              m.ratePerKg * m.quantityKg,
              m.recoveredBySettlement ?? null,
              // Without this, DEFAULT NOW() would stamp every seeded charge
              // "today" — wrong for a 2020-dated historical dispatch and the
              // reason EST-10's Fertilizer entries were all showing today's
              // date instead of their real dispatch date.
              m.date,
            ],
          );
          chargeCount++;
        }
      }
    }
    console.log(`Seeded ${MOVEMENT_SEEDS.length} stock movements, ${chargeCount} fertilizer charges`);

    // ── Reports (RPT-01..04) ──

    for (const e of EXPENSE_ENTRY_SEEDS) {
      await client.query(
        `INSERT INTO expense_entries (id, category, description, amount, entry_date, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           category = EXCLUDED.category, description = EXCLUDED.description,
           amount = EXCLUDED.amount, entry_date = EXCLUDED.entry_date,
           entered_by = EXCLUDED.entered_by`,
        [e.id, e.category, e.description, e.amount, e.date, e.enteredBy],
      );
    }
    console.log(`Seeded ${EXPENSE_ENTRY_SEEDS.length} expense entries`);

    // ── Administration (ADM-01..04) ──

    let permCount = 0;
    for (const [role, mods] of Object.entries(PERMISSION_MATRIX)) {
      for (const [module, level] of Object.entries(mods)) {
        await client.query(
          `INSERT INTO role_permissions (role, module, level) VALUES ($1, $2, $3)
           ON CONFLICT (role, module) DO UPDATE SET level = EXCLUDED.level`,
          [role, module, level],
        );
        permCount++;
      }
    }
    console.log(`Seeded ${permCount} role-permission cells`);

    for (const g of GRADE_RATE_SEEDS) {
      await client.query(
        `INSERT INTO grade_rates (id, super_rate, normal_rate, effective_date, set_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           super_rate = EXCLUDED.super_rate, normal_rate = EXCLUDED.normal_rate,
           effective_date = EXCLUDED.effective_date`,
        [g.id, g.superRate, g.normalRate, g.effectiveDate, 'A. Bandara'],
      );
    }
    console.log(`Seeded ${GRADE_RATE_SEEDS.length} grade-rate versions`);

    for (const s of SETTING_SEEDS) {
      await client.query(
        `INSERT INTO system_settings (key, value, updated_by)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [s.key, JSON.stringify(s.value), 'A. Bandara'],
      );
    }
    console.log(`Seeded ${SETTING_SEEDS.length} system settings`);

    for (const a of AUDIT_LOG_SEEDS) {
      await client.query(
        `INSERT INTO audit_logs (id, created_at, user_name, role, action, module, record, record_href, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.createdAt, a.userName, a.role, a.action, a.module, a.record, a.recordHref, a.details],
      );
    }
    console.log(`Seeded ${AUDIT_LOG_SEEDS.length} audit-log baseline rows`);
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
