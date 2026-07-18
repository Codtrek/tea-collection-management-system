import type { EstateAdvance, EstateOwner, Settlement } from './types'

/* Example estates — figures drawn from the module docs' example data. */

export const ESTATES: EstateOwner[] = [
  {
    id: 'EST-0001',
    estateName: 'Green Valley Estate',
    ownerName: 'K. Perera',
    nic: '197845678123',
    contact: '0772345678',
    email: 'kperera@gmail.com',
    location: 'Nuwara Eliya',
    address: 'Green Valley, Kandapola Rd, Nuwara Eliya',
    route: 'Route 3',
    selfDelivery: false,
    status: 'Active',
    ytdDeliveriesKg: 12480,
    bank: { bank: 'Bank of Ceylon', branch: 'Nuwara Eliya', account: '8802345671' },
    documents: [
      { name: 'Estate ownership deed.pdf', uploadedOn: '2025-02-14' },
      { name: 'NIC copy.pdf', uploadedOn: '2025-02-14' },
    ],
    lastUpdatedBy: 'A. Bandara',
    lastUpdatedOn: '2026-06-30',
  },
  {
    id: 'EST-0002',
    estateName: 'Hilltop Estate',
    ownerName: 'M. Dissanayake',
    nic: '198212345987',
    contact: '0713456789',
    location: 'Hatton',
    address: 'Hilltop Division, Dickoya Rd, Hatton',
    route: 'Route 5',
    selfDelivery: false,
    status: 'Active',
    ytdDeliveriesKg: 9310,
    bank: { bank: "People's Bank", branch: 'Hatton', account: '1104567892' },
    documents: [{ name: 'Estate ownership deed.pdf', uploadedOn: '2025-03-02' }],
  },
  {
    id: 'EST-0003',
    estateName: 'Mount Rest Estate',
    ownerName: 'P. Wickramasinghe',
    nic: '196934567012',
    contact: '0764567890',
    email: 'mountrest@yahoo.com',
    location: 'Kandy',
    address: 'Mount Rest, Pussellawa Rd, Kandy',
    route: 'Route 2',
    selfDelivery: true,
    status: 'Active',
    ytdDeliveriesKg: 11020,
    bank: { bank: 'Commercial Bank', branch: 'Kandy', account: '7709876543' },
    documents: [
      { name: 'Estate ownership deed.pdf', uploadedOn: '2024-11-20' },
      { name: 'Self-delivery agreement.pdf', uploadedOn: '2025-01-08' },
    ],
  },
  {
    id: 'EST-0004',
    estateName: 'Silver Peak Estate',
    ownerName: 'D. Herath',
    nic: '199056789234',
    contact: '0785678901',
    location: 'Talawakelle',
    address: 'Silver Peak Division, Talawakelle',
    route: 'Route 3',
    selfDelivery: false,
    status: 'Active',
    ytdDeliveriesKg: 4890,
    // Missing bank details — excluded from settlement runs until added (UC-054 exception).
    bank: { bank: '', branch: '', account: '' },
    documents: [{ name: 'NIC copy.pdf', uploadedOn: '2026-01-15' }],
  },
  {
    id: 'EST-0005',
    estateName: 'Riverside Estate',
    ownerName: 'J. Kumara',
    nic: '197512398765',
    contact: '0726789012',
    location: 'Gampola',
    address: 'Riverside, Nawalapitiya Rd, Gampola',
    route: 'Route 2',
    selfDelivery: false,
    status: 'Inactive',
    ytdDeliveriesKg: 1560,
    bank: { bank: 'Sampath Bank', branch: 'Gampola', account: '3301239876' },
    documents: [{ name: 'Estate ownership deed.pdf', uploadedOn: '2024-08-05' }],
    lastUpdatedBy: 'A. Bandara',
    lastUpdatedOn: '2026-04-12',
  },
]

export const ESTATE_ADVANCES: EstateAdvance[] = [
  {
    id: 'EADV-2026-0031',
    estateId: 'EST-0001',
    estateName: 'Green Valley Estate',
    amount: 50000,
    reason: 'Pre-season plucking labour costs',
    dateIssued: '2026-07-05',
    issuedBy: 'S. Fernando',
    status: 'Pending deduction',
  },
  {
    id: 'EADV-2026-0028',
    estateId: 'EST-0002',
    estateName: 'Hilltop Estate',
    amount: 30000,
    reason: 'Fertilizer application labour',
    dateIssued: '2026-06-21',
    issuedBy: 'S. Fernando',
    status: 'Pending deduction',
  },
  {
    id: 'EADV-2026-0022',
    estateId: 'EST-0003',
    estateName: 'Mount Rest Estate',
    amount: 40000,
    reason: 'Transport vehicle repair',
    dateIssued: '2026-05-30',
    issuedBy: 'A. Bandara',
    status: 'Deducted',
  },
]

/*
  July 2026 settlement run. Rates from Factory Setup (ADM-01): Super Rs. 185/kg,
  Normal Rs. 95/kg effective 01/07/2026. Fertilizer deductions mirror the
  Fertilizer module's linked dispatches (Urea ≈ Rs. 190/kg at cost).
*/
export const SETTLEMENTS: Settlement[] = [
  {
    id: 'SET-2026-07-001',
    estateId: 'EST-0001',
    estateName: 'Green Valley Estate',
    period: 'July 2026',
    superKg: 408,
    normalKg: 175,
    superRate: 185,
    normalRate: 95,
    transportCost: 8400,
    fertilizerDeduction: 22800, // 120 kg Urea dispatched 20/06 (FB-2291)
    advanceDeduction: 50000,
    status: 'Pending',
    selfDelivery: false,
  },
  {
    id: 'SET-2026-07-002',
    estateId: 'EST-0002',
    estateName: 'Hilltop Estate',
    period: 'July 2026',
    superKg: 120,
    normalKg: 277,
    superRate: 185,
    normalRate: 95,
    transportCost: 6100,
    fertilizerDeduction: 11400, // 60 kg Urea dispatched 05/07 (FB-2291)
    advanceDeduction: 30000,
    status: 'Pending',
    selfDelivery: false,
  },
  {
    id: 'SET-2026-07-003',
    estateId: 'EST-0003',
    estateName: 'Mount Rest Estate',
    period: 'July 2026',
    superKg: 188,
    normalKg: 164,
    superRate: 185,
    normalRate: 95,
    transportCost: 0, // self-delivery exemption
    fertilizerDeduction: 15200, // 80 kg NPK dispatched 28/06 (FB-2287)
    advanceDeduction: 0,
    status: 'Pending',
    selfDelivery: true,
  },
  {
    id: 'SET-2026-07-004',
    estateId: 'EST-0004',
    estateName: 'Silver Peak Estate',
    period: 'July 2026',
    superKg: 96,
    normalKg: 0,
    superRate: 185,
    normalRate: 95,
    transportCost: 3800,
    fertilizerDeduction: 3800, // 20 kg Potash dispatched 30/05 (FB-2274)
    advanceDeduction: 0,
    status: 'Pending',
    selfDelivery: false,
    missingBank: true,
  },
  {
    id: 'SET-2026-06-001',
    estateId: 'EST-0001',
    estateName: 'Green Valley Estate',
    period: 'June 2026',
    superKg: 380,
    normalKg: 214,
    superRate: 180,
    normalRate: 92,
    transportCost: 7900,
    fertilizerDeduction: 0,
    advanceDeduction: 0,
    status: 'Processed',
    selfDelivery: false,
    processedBy: 'A. Bandara',
    processedOn: '2026-07-01',
  },
  {
    id: 'SET-2026-06-003',
    estateId: 'EST-0003',
    estateName: 'Mount Rest Estate',
    period: 'June 2026',
    superKg: 240,
    normalKg: 198,
    superRate: 180,
    normalRate: 92,
    transportCost: 0,
    fertilizerDeduction: 7600,
    advanceDeduction: 40000,
    status: 'Processed',
    selfDelivery: true,
    processedBy: 'A. Bandara',
    processedOn: '2026-07-01',
  },
]

export function grossRevenue(s: Settlement): number {
  return s.superKg * s.superRate + s.normalKg * s.normalRate
}

export function netPayable(s: Settlement): number {
  return grossRevenue(s) - s.transportCost - s.fertilizerDeduction - s.advanceDeduction
}

export function advancesForEstate(estateId: string): EstateAdvance[] {
  return ESTATE_ADVANCES.filter((a) => a.estateId === estateId)
}

export function settlementsForEstate(estateId: string): Settlement[] {
  return SETTLEMENTS.filter((s) => s.estateId === estateId)
}
