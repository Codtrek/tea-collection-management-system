import { RolePermissionEntity } from '../../admin/role-permission.entity';
import { DispatchAccessService } from '../../dispatch/dispatch-access.service';
import { DispatchNotifier } from '../../dispatch/dispatch-notifier.service';
import { NotificationEntity } from '../../dispatch/notification.entity';
import { EstateOwnerEntity } from '../../estates/estate-owner.entity';
import { EstateEntity } from '../../estates/estate.entity';
import { SettlementEntity } from '../../estates/settlement.entity';
import { SystemSettingEntity } from '../../admin/system-setting.entity';
import { CollectionRecordEntity } from '../collection-record.entity';
import { CollectionSettingsService } from '../collection-settings.service';
import { type Actor } from '../collections.service';
import { ComplaintEntity } from '../complaint.entity';
import { DeliveryGradeLineEntity } from '../delivery-grade-line.entity';
import { DeliveryGradeRevisionEntity } from '../delivery-grade-revision.entity';
import { GradeCorrectionRequestEntity } from '../grade-correction-request.entity';
import { GradingNotificationEntity } from '../grading-notification.entity';
import { GradingNotificationService } from '../grading-notification.service';
import { GradingService } from '../grading.service';
import { SettlementAdjustmentEntity } from '../settlement-adjustment.entity';
import { FakeManager, FakeRepo } from './fake-repo';

export const T0 = new Date('2026-08-10T09:00:00.000Z');
export const minutes = (d: Date, n: number) =>
  new Date(d.getTime() + n * 60_000);

export const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 7 };
export const manager: Actor = {
  name: 'R. Jayasuriya',
  role: 'Manager',
  sub: 8,
};
export const admin: Actor = {
  name: 'A. Bandara',
  role: 'Administrator',
  sub: 9,
};

/** The default matrix from the migration: Officer grades, Manager approves, Admin only views. */
const PERMS: [string, string, string][] = [
  ['Administrator', 'grading', 'view'],
  ['Officer', 'grading', 'edit'],
  ['Manager', 'grading', 'view'],
  ['Administrator', 'gradingApproval', 'view'],
  ['Officer', 'gradingApproval', 'view'],
  ['Manager', 'gradingApproval', 'approve'],
];

export function makeRecord(
  overrides: Partial<CollectionRecordEntity> = {},
): CollectionRecordEntity {
  return {
    id: 'GV-2026-0001',
    estateId: 1,
    estateRef: 'EST-0001',
    estateName: 'Green Valley Estate',
    routeId: 3,
    routeName: 'Route 3',
    weightKg: '150.00',
    gradeLines: [],
    status: 'collected',
    collectionDate: '2026-08-10',
    agentId: null,
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [
      {
        status: 'Collected',
        timestamp: '2026-08-10T08:00:00.000Z',
        by: 'R. Senanayake',
      },
    ],
    provisional: null,
    mismatch: null,
    gradedAt: null,
    lockedAt: null,
    finalizedAt: null,
    settlementId: null,
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    createdAt: new Date('2026-08-10T00:00:00.000Z'),
    ...overrides,
  };
}

export function gradeLine(
  grade: 'super' | 'normal',
  kg: string,
): DeliveryGradeLineEntity {
  return { grade, weightKg: kg } as DeliveryGradeLineEntity;
}

export function makeSettlement(
  overrides: Partial<SettlementEntity> = {},
): SettlementEntity {
  return {
    id: 'SET-2026-08-001',
    estateId: 1,
    estateName: 'Green Valley Estate',
    period: 'August 2026',
    superKg: '100.00',
    normalKg: '50.00',
    superRate: '185.00',
    normalRate: '95.00',
    transportCost: '0',
    fertilizerDeduction: '0',
    advanceDeduction: '0',
    adjustmentAmount: '0',
    status: 'processed',
    selfDelivery: false,
    missingBank: false,
    processedBy: 'A. Bandara',
    processedOn: T0,
    createdAt: T0,
    ...overrides,
  };
}

/** Everything the grading flow touches, wired to in-memory repos. Time is driven by jest fake timers. */
export function buildGradingHarness() {
  const manager = new FakeManager();
  const reg = <T extends object>(entity: unknown, repo: FakeRepo<T>) => {
    manager.register(entity, repo as unknown as FakeRepo<object>);
    return repo;
  };

  const records = reg(
    CollectionRecordEntity,
    new FakeRepo<CollectionRecordEntity>(),
  );
  const revisions = reg(
    DeliveryGradeRevisionEntity,
    new FakeRepo<DeliveryGradeRevisionEntity>(),
  );
  const requests = reg(
    GradeCorrectionRequestEntity,
    new FakeRepo<GradeCorrectionRequestEntity>(),
  );
  const adjustments = reg(
    SettlementAdjustmentEntity,
    new FakeRepo<SettlementAdjustmentEntity>(),
  );
  const settlements = reg(SettlementEntity, new FakeRepo<SettlementEntity>());
  const outbox = reg(
    GradingNotificationEntity,
    new FakeRepo<GradingNotificationEntity>(),
  );
  const complaints = reg(ComplaintEntity, new FakeRepo<ComplaintEntity>());
  const estates = reg(EstateEntity, new FakeRepo<EstateEntity>());
  const owners = reg(EstateOwnerEntity, new FakeRepo<EstateOwnerEntity>());
  const notifications = reg(
    NotificationEntity,
    new FakeRepo<NotificationEntity>(),
  );
  const perms = reg(
    RolePermissionEntity,
    new FakeRepo<RolePermissionEntity>(null),
  );
  const settingRows = reg(
    SystemSettingEntity,
    new FakeRepo<SystemSettingEntity>(null),
  );
  const tokens = new FakeRepo<{ userId: number; token: string }>(null);

  for (const [role, module, level] of PERMS)
    perms.seed({ role, module, level });
  estates.seed({
    id: 1,
    ownerId: 10,
    name: 'Green Valley Estate',
  } as EstateEntity);
  owners.seed({ id: 10, userId: 77, name: 'K. Perera' } as EstateOwnerEntity);

  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const access = new DispatchAccessService(perms as never);
  const settings = new CollectionSettingsService(settingRows as never);
  const notifier = new DispatchNotifier(
    notifications as never,
    tokens as never,
    {} as never,
  );
  const notifyService = () =>
    new GradingNotificationService(
      outbox as never,
      records as never,
      estates as never,
      owners as never,
      notifier,
      settings,
      audit as never,
    );
  const outboxService = notifyService();
  const grading = new GradingService(
    records as never,
    revisions as never,
    requests as never,
    settlements as never,
    outbox as never,
    access,
    settings,
    outboxService,
    audit as never,
  );

  return {
    manager,
    records,
    revisions,
    requests,
    adjustments,
    settlements,
    outbox,
    complaints,
    estates,
    owners,
    notifications,
    settingRows,
    perms,
    audit,
    grading,
    outboxService,
    notifyService,
    notifier,
    setSetting: (value: Record<string, unknown>) => {
      const existing = settingRows.rows.find((r) => r.key === 'collection');
      if (existing) existing.value = value;
      else
        settingRows.seed({ key: 'collection', value } as SystemSettingEntity);
    },
  };
}

/** Freeze `Date` only — promises and microtasks keep running normally. */
export function freezeClock(at: Date = T0): void {
  jest.useFakeTimers({
    now: at,
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
      'queueMicrotask',
      'performance',
      'hrtime',
    ],
  });
}

export function setClock(at: Date): void {
  jest.setSystemTime(at);
}
