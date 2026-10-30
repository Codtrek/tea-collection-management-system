import type { EstateOwner } from './types'

/*
  Example estates — figures drawn from the module docs' example data.
  Kept (not deleted) after the Estates + Payments backend slice landed
  (2026-07-26): still consumed by EstateAnalyticsPage (EST-09, deliberately
  left on mock data this slice — self-contained charts, no backend
  dependency), and by CollectionExceptionEntryPage / Fertilizer's
  LogRequestPage to resolve an estate/route/agent, since those modules
  aren't wired to the real Estates API yet. Advance/settlement fixtures and
  their `grossRevenue`/`netPayable` helpers moved to `calc.ts` + the real
  backend — see `services/estates.ts`.
*/

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
