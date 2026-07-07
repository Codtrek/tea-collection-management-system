import { localAuthService } from './local/authService';
import { localCollectionService } from './local/collectionService';
import { localEstateService } from './local/estateService';
import { localEvidenceSyncService } from './local/evidenceSyncService';
import { localFactoryService } from './local/factoryService';
import { localPaymentService } from './local/paymentService';
import { localPickupService } from './local/pickupService';
import { localRouteService } from './local/routeService';
import type {
  AuthService,
  CollectionService,
  EstateService,
  EvidenceSyncService,
  FactoryService,
  PaymentService,
  PickupService,
  RouteService,
} from './types';

export const authService: AuthService = localAuthService;
export const collectionService: CollectionService = localCollectionService;
export const estateService: EstateService = localEstateService;
export const evidenceSyncService: EvidenceSyncService = localEvidenceSyncService;
export const factoryService: FactoryService = localFactoryService;
export const paymentService: PaymentService = localPaymentService;
export const pickupService: PickupService = localPickupService;
export const routeService: RouteService = localRouteService;

export type {
  ActionResult,
  AuthResult,
  AuthService,
  CaptureEvidenceResult,
  CollectionActionResult,
  CollectionRecord,
  CollectionService,
  Complaint,
  CreateCollectionInput,
  CreatePickupRequestInput,
  CreatePickupResult,
  CreateRouteInput,
  DemoAccount,
  Estate,
  EstateService,
  EvidenceStatus,
  EvidenceSyncService,
  Factory,
  FactoryService,
  FlushQueueResult,
  GeneratePaymentInput,
  MonthlyPayment,
  PaymentActionResult,
  PaymentService,
  PaymentStatus,
  PickupActionResult,
  PickupRequest,
  PickupService,
  PickupStatus,
  ReceiveCollectionInput,
  ReceiveResult,
  ReceivingRecord,
  Route,
  RouteService,
  RouteStatus,
  RouteStop,
  TeaGrade,
} from './types';
