import type { TeaGrade } from '@/domain/collectionRecord';
import type { EvidenceStatus } from '@/domain/evidenceSync';
import type { PickupStatus } from '@/domain/pickupStatus';
import type { RouteStatus } from '@/domain/routeStatus';
import type { User } from '@/types/user';

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };

export type DemoAccount = Pick<User, 'id' | 'name' | 'phone' | 'role'>;

/**
 * Boundary between screens and data source. Today it's backed by local SQLite;
 * swap the implementation in services/index.ts for an HTTP client once the
 * backend API exists, without touching any screen code.
 */
export interface AuthService {
  login(phone: string, password: string): Promise<AuthResult>;
  getDemoAccounts(): Promise<DemoAccount[]>;
}

export type { EvidenceStatus, RouteStatus };

export type RouteStop = {
  id: string;
  routeId: string;
  estateId: string;
  estateName: string;
  stopOrder: number;
  hasTeaPickup: boolean;
  hasFertilizerDelivery: boolean;
};

export type Route = {
  id: string;
  routeDate: string;
  collectorId: string;
  truckName: string | null;
  driverName: string | null;
  status: RouteStatus;
  statusReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stops: RouteStop[];
};

export type CreateRouteInput = {
  routeDate: string;
  collectorId: string;
  truckName?: string;
  driverName?: string;
  stops: { estateId: string; hasTeaPickup: boolean; hasFertilizerDelivery: boolean }[];
};

export type ActionResult = { ok: true; route: Route } | { ok: false; error: string };

export type Estate = {
  id: string;
  ownerId: string;
  name: string;
};

export interface EstateService {
  listEstates(): Promise<Estate[]>;
}

export interface FactoryService {
  listFactories(): Promise<Factory[]>;
}

export interface RouteService {
  getRouteById(routeId: string): Promise<Route | null>;
  listRoutesForDate(routeDate: string): Promise<Route[]>;
  listRoutesForCollector(collectorId: string, routeDate: string): Promise<Route[]>;
  createRoute(input: CreateRouteInput): Promise<Route>;
  startRoute(routeId: string, collectorId: string): Promise<ActionResult>;
  setDelayed(routeId: string, reason: string): Promise<ActionResult>;
  setCancelled(routeId: string, reason: string): Promise<ActionResult>;
  completeRoute(routeId: string): Promise<ActionResult>;
}

export type { PickupStatus };

export type Factory = {
  id: string;
  name: string;
};

export type PickupRequest = {
  id: string;
  estateId: string;
  estateName: string;
  ownerId: string;
  factoryId: string;
  routeStopId: string | null;
  requestDate: string;
  status: PickupStatus;
  declineReason: string | null;
  estimatedWeightKg: number | null;
  gpsPinLat: number | null;
  gpsPinLng: number | null;
  requestedAt: string;
  resolvedAt: string | null;
};

export type CreatePickupRequestInput = {
  estateId: string;
  ownerId: string;
  factoryId: string;
  estimatedWeightKg?: number;
  gpsPinLat?: number;
  gpsPinLng?: number;
};

export type CreatePickupResult = { ok: true; request: PickupRequest } | { ok: false; error: string };
export type PickupActionResult = { ok: true; request: PickupRequest } | { ok: false; error: string };

export interface PickupService {
  createRequest(input: CreatePickupRequestInput): Promise<CreatePickupResult>;
  getActiveRequestForEstate(estateId: string): Promise<PickupRequest | null>;
  listForCollector(collectorId: string): Promise<PickupRequest[]>;
  accept(id: string): Promise<PickupActionResult>;
  decline(id: string, reason: string): Promise<PickupActionResult>;
  markOnTheWay(id: string): Promise<PickupActionResult>;
  markPickedUp(id: string): Promise<PickupActionResult>;
  cancel(id: string): Promise<PickupActionResult>;
}

export type { TeaGrade };

export type ReceivingRecord = {
  id: string;
  collectionRecordId: string;
  receivingOfficerId: string;
  factoryId: string;
  receivedWeightKg: number;
  teaGrade: TeaGrade;
  receivedAt: string;
};

export type CollectionRecord = {
  id: string;
  pickupRequestId: string | null;
  routeStopId: string | null;
  collectorId: string;
  estateId: string;
  estateName: string;
  actualWeightKg: number;
  selfDelivered: boolean;
  ownerConfirmed: boolean;
  evidenceUrl: string | null;
  evidenceStatus: EvidenceStatus;
  collectedAt: string;
  receiving: ReceivingRecord | null;
};

export type Complaint = {
  id: string;
  type: 'weight_mismatch';
  raisedByUserId: string;
  collectionRecordId: string | null;
  description: string | null;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
};

export type CreateCollectionInput = {
  collectorId: string;
  estateId: string;
  actualWeightKg: number;
  pickupRequestId?: string;
  routeStopId?: string;
  selfDelivered?: boolean;
  evidenceUrl?: string;
};

export type ReceiveCollectionInput = {
  collectionRecordId: string;
  receivingOfficerId: string;
  factoryId: string;
  receivedWeightKg: number;
  teaGrade: TeaGrade;
};

export type CollectionActionResult = { ok: true; record: CollectionRecord } | { ok: false; error: string };

export type ReceiveResult =
  | { ok: true; record: CollectionRecord; complaint: Complaint | null }
  | { ok: false; error: string };

export interface CollectionService {
  createRecord(input: CreateCollectionInput): Promise<CollectionActionResult>;
  confirmOwner(recordId: string): Promise<CollectionActionResult>;
  listForCollector(collectorId: string): Promise<CollectionRecord[]>;
  listPendingReceiving(): Promise<CollectionRecord[]>;
  receiveAtFactory(input: ReceiveCollectionInput): Promise<ReceiveResult>;
}

export type CaptureEvidenceResult =
  | { ok: true; status: EvidenceStatus }
  | { ok: false; error: string };

export type FlushQueueResult = { synced: number; failed: number };

export interface EvidenceSyncService {
  captureEvidence(collectionRecordId: string, localUri: string): Promise<CaptureEvidenceResult>;
  flushQueue(): Promise<FlushQueueResult>;
}

export type PaymentStatus = 'pending' | 'finalized' | 'paid';

export type MonthlyPayment = {
  id: string;
  ownerId: string;
  factoryId: string;
  paymentMonth: string;
  superWeightKg: number;
  normalWeightKg: number;
  grossAmount: number;
  transportCost: number;
  fertilizerDeductions: number;
  advanceDeductions: number;
  bankTransferFee: number;
  netAmount: number;
  status: PaymentStatus;
  finalizedAt: string | null;
};

export type GeneratePaymentInput = {
  ownerId: string;
  factoryId: string;
  paymentMonth: string;
  superRatePerKg: number;
  normalRatePerKg: number;
  transportRatePerKg?: number;
  fertilizerDeductions?: number;
  advanceDeductions?: number;
  bankTransferFee?: number;
};

export type PaymentActionResult = { ok: true; payment: MonthlyPayment } | { ok: false; error: string };

export interface PaymentService {
  generateForMonth(input: GeneratePaymentInput): Promise<PaymentActionResult>;
  finalize(id: string): Promise<PaymentActionResult>;
  listForOwner(ownerId: string): Promise<MonthlyPayment[]>;
  listAll(): Promise<MonthlyPayment[]>;
}
