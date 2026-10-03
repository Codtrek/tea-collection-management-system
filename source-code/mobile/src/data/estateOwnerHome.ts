import type {
  ActiveDelivery,
  Estate,
  MonthlySummary,
  PickupRequest,
} from "@/types/estateOwner";

/**
 * Mock data for the Estate Owner home screen.
 * Follows the existing `src/data/*` pattern (see `userRoles.ts`).
 * Swap these arrays for real API responses once the estate endpoints land.
 */

export const ownerName = "Radeesh";

export const todayLabel = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "short",
});

export const monthlySummary: MonthlySummary = {
  month: new Date().toLocaleDateString("en-GB", { month: "long" }),
  totalWeightKg: 34250,
  revenue: 100000,
};

export const registeredEstates: Estate[] = [
  {
    id: "est-1",
    name: "Green Valley Estate",
    location: "Nuwara Eliya",
    areaAcres: 42,
    grade: "Super",
  },
  {
    id: "est-2",
    name: "Hilltop Estate",
    location: "Kotmale",
    areaAcres: 28,
    grade: "Normal",
  },
  {
    id: "est-3",
    name: "Misty Ridge Estate",
    location: "Hatton",
    areaAcres: 35,
    grade: "Mixed",
  },
];

export const pendingRequests: PickupRequest[] = [
  {
    id: "req-1",
    estateName: "Green Valley Estate",
    factory: "Kotmale MPT",
    estimatedWeightKg: 120,
    requestedAt: "Today, 8:30 AM",
    status: "pending",
  },
  {
    id: "req-2",
    estateName: "Hilltop Estate",
    factory: "Kotmale MPT",
    estimatedWeightKg: 90,
    requestedAt: "Today, 9:10 AM",
    status: "pending",
  },
];

export const activeDeliveries: ActiveDelivery[] = [
  {
    id: "del-1",
    estateName: "Green Valley Estate",
    collector: "Sunil Perera",
    vehicle: "LP-4471",
    weightKg: 340,
    status: "in_transit",
  },
  {
    id: "del-2",
    estateName: "Hilltop Estate",
    collector: "Kamal Silva",
    vehicle: "LP-2233",
    weightKg: 210,
    status: "loading",
  },
  {
    id: "del-3",
    estateName: "Misty Ridge Estate",
    collector: "Nuwan Jayawardena",
    vehicle: "LP-8890",
    weightKg: 480,
    status: "at_factory",
  },
];
