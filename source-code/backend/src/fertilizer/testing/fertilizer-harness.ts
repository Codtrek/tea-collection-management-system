import type { Repository } from 'typeorm';
import type { AuditService } from '../../audit/audit.service';
import { FakeManager, FakeRepo } from '../../collections/testing/fake-repo';
import type { RolePermissionEntity } from '../../admin/role-permission.entity';
import type { DevicePushTokenEntity } from '../../dispatch/device-push-token.entity';
import { DispatchAccessService } from '../../dispatch/dispatch-access.service';
import type { DispatchNotifier } from '../../dispatch/dispatch-notifier.service';
import { buildHarness } from '../../dispatch/testing/harness';
import { FakeRepository } from '../../dispatch/testing/fake-repository';
import type { EstateOwnerEntity } from '../../estates/estate-owner.entity';
import type { EstateEntity } from '../../estates/estate.entity';
import { FertilizerAllocationEntity } from '../fertilizer-allocation.entity';
import { FertilizerBatchEntity } from '../fertilizer-batch.entity';
import { FertilizerChargeEntity } from '../fertilizer-charge.entity';
import { FertilizerDeliveryEntity } from '../fertilizer-delivery.entity';
import { FertilizerDeliveryService } from '../fertilizer-delivery.service';
import { FertilizerItemPriceEntity } from '../fertilizer-item-price.entity';
import { FertilizerNotificationEntity } from '../fertilizer-notification.entity';
import { FertilizerPositionService } from '../fertilizer-position.service';
import { FertilizerNotificationService } from '../fertilizer-notification.service';
import { FertilizerPaymentEntity } from '../fertilizer-payment.entity';
import { FertilizerRequestEventEntity } from '../fertilizer-request-event.entity';
import { FertilizerRequestEntity } from '../fertilizer-request.entity';
import { FertilizerRequestService } from '../fertilizer-request.service';
import type {
  FertilizerSettings,
  FertilizerSettingsService,
} from '../fertilizer-settings.service';
import { FertilizerStockLedger } from '../fertilizer-stock-ledger.service';
import { FertilizerViewService } from '../fertilizer-view.service';
import { FertilizerService } from '../fertilizer.service';
import { StockMovementEntity } from '../stock-movement.entity';

/** Friday 2026-10-09, 09:30 Sri Lanka — same clock as the dispatch harness. */
export const NOW = new Date('2026-10-09T04:00:00.000Z');
export const TODAY = '2026-10-09';
/** A Sri Lanka 09:30 on `date`. */
export const at = (date: string) => new Date(`${date}T04:00:00.000Z`);

export const officer = { name: 'S. Fernando', role: 'Officer', sub: 100 };
export const manager = { name: 'R. Jayasuriya', role: 'Manager', sub: 101 };
export const admin = { name: 'A. Bandara', role: 'Administrator', sub: 102 };

/** The seeded data-driven defaults (Fertilizer-Delivery-Addendum §4). */
const MATRIX: [string, string, string][] = [
  ['Administrator', 'fertilizer', 'approve'],
  ['Officer', 'fertilizer', 'edit'],
  ['Manager', 'fertilizer', 'view'],
  ['Administrator', 'fertilizerApproval', 'view'],
  ['Officer', 'fertilizerApproval', 'approve'],
  ['Manager', 'fertilizerApproval', 'view'],
  ['Administrator', 'fertilizerManagerApproval', 'view'],
  ['Officer', 'fertilizerManagerApproval', 'view'],
  ['Manager', 'fertilizerManagerApproval', 'approve'],
  ['Administrator', 'administration', 'approve'],
  ['Officer', 'administration', 'none'],
  ['Manager', 'administration', 'none'],
];

/**
 * The whole fertilizer flow over in-memory fakes, on top of the dispatch harness (routes 1–4
 * run daily, agents 1–5, the real route resolver / schedule / agent identity). Estate 1
 * (Green Valley) is on Route 1, owner user 501.
 */
export function buildFertilizerHarness(
  settings: Partial<FertilizerSettings> = {},
) {
  const d = buildHarness();
  const manager_ = new FakeManager();
  const repo = <T extends object>(entity: unknown) => {
    const r = new FakeRepo<T>();
    manager_.register(entity, r as unknown as FakeRepo<object>);
    return r;
  };
  const requests = repo<FertilizerRequestEntity>(FertilizerRequestEntity);
  const deliveries = repo<FertilizerDeliveryEntity>(FertilizerDeliveryEntity);
  const allocations = repo<FertilizerAllocationEntity>(
    FertilizerAllocationEntity,
  );
  const batches = repo<FertilizerBatchEntity>(FertilizerBatchEntity);
  const movements = repo<StockMovementEntity>(StockMovementEntity);
  const charges = repo<FertilizerChargeEntity>(FertilizerChargeEntity);
  const payments = repo<FertilizerPaymentEntity>(FertilizerPaymentEntity);
  const events = repo<FertilizerRequestEventEntity>(
    FertilizerRequestEventEntity,
  );
  const notices = repo<FertilizerNotificationEntity>(
    FertilizerNotificationEntity,
  );
  const prices = repo<FertilizerItemPriceEntity>(FertilizerItemPriceEntity);
  const owners = new FakeRepo<EstateOwnerEntity>();
  const tokens = new FakeRepository<DevicePushTokenEntity>(null);
  const perms = new FakeRepository<RolePermissionEntity>(null);
  MATRIX.forEach(([role, module, level]) =>
    perms.seed({ role, module, level }),
  );

  d.estates.seed(
    {
      id: 1,
      ownerId: 1,
      name: 'Green Valley Estate',
      routeId: 1,
      routeName: 'Route 1',
      selfDelivery: false,
      status: 'active',
    } as EstateEntity,
    {
      id: 2,
      ownerId: 2,
      name: 'Hilltop Estate',
      routeId: 2,
      routeName: 'Route 2',
      selfDelivery: false,
      status: 'active',
    } as EstateEntity,
  );
  owners.seed(
    { id: 1, userId: 501, name: 'K. Perera' } as EstateOwnerEntity,
    { id: 2, userId: 502, name: 'M. Silva' } as EstateOwnerEntity,
  );
  prices.seed({
    item: 'Urea Fertilizer',
    ratePerKg: '90.00',
    effectiveDate: '2026-01-01',
    setBy: 'seed',
  } as FertilizerItemPriceEntity);

  const cast = <T>(r: unknown) => r as Repository<T & object>;
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const settingsSvc = {
    get: jest.fn().mockResolvedValue({
      managerApprovalAboveKg: 500,
      maxDeliveryAttempts: 3,
      expiringSoonDays: 30,
      ...settings,
    }),
  } as unknown as FertilizerSettingsService;
  const access = new DispatchAccessService(cast<RolePermissionEntity>(perms));
  const ledger = new FertilizerStockLedger();
  const positions = new FertilizerPositionService(
    cast(batches),
    cast(requests),
    cast(allocations),
    settingsSvc,
  );
  const view = new FertilizerViewService(
    cast(requests),
    cast(deliveries),
    cast(allocations),
    cast(batches),
    cast(charges),
    cast(payments),
    cast(events),
    cast(notices),
    cast(d.estates),
    cast(d.routes),
    d.resolver,
    d.schedule,
    d.directory,
    settingsSvc,
    positions,
  );
  const requestService = new FertilizerRequestService(
    cast(requests),
    cast(d.estates),
    cast(prices),
    cast(charges),
    cast(payments),
    ledger,
    settingsSvc,
    access,
    audit as unknown as AuditService,
    view,
  );
  const delivery = new FertilizerDeliveryService(
    cast(requests),
    cast(deliveries),
    cast(d.estates),
    cast(d.routes),
    cast(d.dayStatus),
    ledger,
    d.schedule,
    d.resolver,
    d.directory,
    d.self,
    d.hooks,
    settingsSvc,
    access,
    audit as unknown as AuditService,
    requestService,
    view,
  );
  delivery.onModuleInit();
  const notifier = {
    deliverToUser: jest.fn().mockResolvedValue({ duplicate: false }),
  };
  const notificationService = new FertilizerNotificationService(
    cast(notices),
    cast(requests),
    cast(owners),
    cast(tokens),
    notifier as unknown as DispatchNotifier,
  );
  const stock = new FertilizerService(
    cast(batches),
    cast(movements),
    cast(requests),
    cast(charges),
    cast(allocations),
    access,
    audit as unknown as AuditService,
    positions,
  );

  let batchSeq = 0;
  const h = {
    ...d,
    requests,
    deliveries,
    allocations,
    batches,
    movements,
    charges,
    payments,
    events,
    notices,
    prices,
    owners,
    tokens,
    audit,
    settingsSvc,
    ledger,
    positions,
    view,
    requestService,
    delivery,
    notifier,
    notificationService,
    stock,

    batch(o: { item?: string; qty: number; expiry: string; lot?: string }) {
      const row = {
        item: o.item ?? 'Urea Fertilizer',
        category: 'Fertilizer',
        quantityKg: String(o.qty),
        unit: 'kg',
        receivedDate: '2026-09-01',
        expiryDate: o.expiry,
        location: 'Warehouse A',
        supplier: 'CIC',
        lotNumber: o.lot ?? `LOT-${++batchSeq}`,
        qualityNotes: null,
        discarded: false,
        lastUpdatedBy: null,
        lastUpdatedOn: null,
        createdAt: NOW,
      } as FertilizerBatchEntity;
      void batches.save(row);
      return row;
    },

    /** Officer logs one request (one item). Returns its formatted id. */
    async request(
      qty: number,
      o: {
        estateId?: number;
        item?: string;
        method?: 'deduct' | 'cash' | 'bank';
      } = {},
    ) {
      const res = await requestService.createRequests(
        {
          estateId: o.estateId ?? 1,
          items: [{ item: o.item ?? 'Urea Fertilizer', quantityKg: qty }],
          paymentMethod: o.method ?? 'deduct',
        },
        'web',
        officer,
        NOW,
      );
      return res.requests[0].id;
    },

    /** Requested → approved (by the officer) → ready for dispatch. */
    async ready(
      qty: number,
      o: { estateId?: number; method?: 'deduct' | 'cash' | 'bank' } = {},
    ) {
      const id = await h.request(qty, o);
      await requestService.decide(id, { decision: 'approve' }, officer, NOW);
      await delivery.markReady(id, officer, NOW);
      return id;
    },

    entity(formattedId: string) {
      return view.find(formattedId);
    },

    async position(item = 'Urea Fertilizer', now: Date = NOW) {
      return (await stock.listPositions(now)).find((p) => p.item === item)!;
    },

    async openAttempt(formattedId: string) {
      const r = await view.find(formattedId);
      return deliveries.rows
        .filter(
          (x) =>
            x.requestId === r.id &&
            x.outcome === null &&
            x.cancelledAt === null,
        )
        .sort((a, b) => b.attemptNo - a.attemptNo)[0];
    },

    /** Agent `agentId` reports delivered at the estate. */
    delivered(
      agentId: number,
      deliveryId: number,
      qty: number,
      now: Date,
      extra: { shortfallReason?: string; syncKey?: string } = {},
    ) {
      return delivery.agentDelivered(
        d.uid(agentId),
        deliveryId,
        {
          deliveredQtyKg: qty,
          ownerName: 'K. Perera',
          ownerConfirmed: true,
          photo: { takenAt: now.toISOString() },
          recordedAt: now.toISOString(),
          syncKey: extra.syncKey ?? `sync-del-${deliveryId}-${qty}`,
          shortfallReason: extra.shortfallReason,
        },
        now,
      );
    },

    failed(agentId: number, deliveryId: number, now: Date) {
      return delivery.agentFailed(
        d.uid(agentId),
        deliveryId,
        {
          reason: 'owner_not_available',
          recordedAt: now.toISOString(),
          syncKey: `sync-fail-${deliveryId}`,
        },
        now,
      );
    },
  };
  return h;
}
