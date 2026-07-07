import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PickupRequestEntity } from '../pickup-requests/entities/pickup-request.entity';
import { CollectorEntity } from '../routes/entities/collector.entity';
import { EstateEntity } from '../routes/entities/estate.entity';
import { FactoryEmployeeEntity } from '../routes/entities/factory-employee.entity';
import {
  canConfirmOwner,
  canReceiveCollection,
  isWeightMismatch,
  validateWeightKg,
  type TeaGrade,
} from './collection-status.util';
import { ComplaintEntity } from './entities/complaint.entity';
import { ReceivingOfficerEntity } from './entities/receiving-officer.entity';
import { TeaCollectionRecordEntity } from './entities/tea-collection-record.entity';
import { TeaReceivingRecordEntity } from './entities/tea-receiving-record.entity';

export type CollectionRecordView = {
  id: number;
  pickupRequestId: number | null;
  routeStopId: number | null;
  collectorId: number;
  estateId: number;
  estateName: string;
  actualWeightKg: number;
  selfDelivered: boolean;
  ownerConfirmed: boolean;
  evidenceUrl: string | null;
  collectedAt: Date;
  receiving: {
    id: number;
    receivingOfficerId: number;
    factoryId: number;
    receivedWeightKg: number;
    teaGrade: TeaGrade;
    receivedAt: Date;
  } | null;
};

export type ComplaintView = {
  id: number;
  type: string;
  raisedByUserId: number;
  collectionRecordId: number | null;
  description: string | null;
  status: string;
  createdAt: Date;
};

export type CreateCollectionInput = {
  estateId: number;
  actualWeightKg: number;
  pickupRequestId?: number;
  routeStopId?: number;
  selfDelivered?: boolean;
  evidenceUrl?: string;
};

export type ReceiveInput = { receivedWeightKg: number; teaGrade: TeaGrade };

export type ReceivingOfficerContext = {
  receivingOfficerId: number;
  factoryId: number;
  raisedByUserId: number;
};

export type CollectionActionResult =
  | { ok: true; record: CollectionRecordView }
  | { ok: false; error: string };

export type ReceiveResult =
  | { ok: true; record: CollectionRecordView; complaint: ComplaintView | null }
  | { ok: false; error: string };

@Injectable()
export class CollectionRecordsService {
  constructor(
    @InjectRepository(TeaCollectionRecordEntity)
    private readonly collectionRecords: Repository<TeaCollectionRecordEntity>,
    @InjectRepository(TeaReceivingRecordEntity)
    private readonly receivingRecords: Repository<TeaReceivingRecordEntity>,
    @InjectRepository(ComplaintEntity)
    private readonly complaints: Repository<ComplaintEntity>,
    @InjectRepository(ReceivingOfficerEntity)
    private readonly receivingOfficers: Repository<ReceivingOfficerEntity>,
    @InjectRepository(PickupRequestEntity)
    private readonly pickupRequests: Repository<PickupRequestEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    @InjectRepository(FactoryEmployeeEntity)
    private readonly factoryEmployees: Repository<FactoryEmployeeEntity>,
    @InjectRepository(CollectorEntity)
    private readonly collectors: Repository<CollectorEntity>,
  ) {}

  private async toView(
    record: TeaCollectionRecordEntity,
  ): Promise<CollectionRecordView> {
    const estate = await this.estates.findOneBy({ id: record.estate_id });
    const receiving = await this.receivingRecords.findOneBy({
      collection_record_id: record.id,
    });
    return {
      id: record.id,
      pickupRequestId: record.pickup_request_id,
      routeStopId: record.route_stop_id,
      collectorId: record.collector_id,
      estateId: record.estate_id,
      estateName: estate?.name ?? '',
      actualWeightKg: Number(record.actual_weight_kg),
      selfDelivered: record.self_delivered,
      ownerConfirmed: record.owner_confirmed,
      evidenceUrl: record.evidence_url,
      collectedAt: record.collected_at,
      receiving: receiving
        ? {
            id: receiving.id,
            receivingOfficerId: receiving.receiving_officer_id,
            factoryId: receiving.factory_id,
            receivedWeightKg: Number(receiving.received_weight_kg),
            teaGrade: receiving.tea_grade,
            receivedAt: receiving.received_at,
          }
        : null,
    };
  }

  async create(
    input: CreateCollectionInput,
    collectorId: number,
  ): Promise<CollectionActionResult> {
    const check = validateWeightKg(input.actualWeightKg);
    if (!check.ok) return check;

    const inserted = await this.collectionRecords.save(
      this.collectionRecords.create({
        pickup_request_id: input.pickupRequestId ?? null,
        route_stop_id: input.routeStopId ?? null,
        collector_id: collectorId,
        estate_id: input.estateId,
        actual_weight_kg: input.actualWeightKg.toFixed(2),
        self_delivered: input.selfDelivered ?? false,
        evidence_url: input.evidenceUrl ?? null,
      }),
    );
    const record = await this.collectionRecords.findOneByOrFail({
      id: inserted.id,
    });
    return { ok: true, record: await this.toView(record) };
  }

  async confirmOwner(id: number): Promise<CollectionActionResult> {
    const record = await this.collectionRecords.findOneBy({ id });
    if (!record) return { ok: false, error: 'Collection record not found' };
    const check = canConfirmOwner(record.owner_confirmed);
    if (!check.ok) return check;

    await this.collectionRecords.update({ id }, { owner_confirmed: true });
    const updated = await this.collectionRecords.findOneByOrFail({ id });
    return { ok: true, record: await this.toView(updated) };
  }

  async listForCollector(collectorId: number): Promise<CollectionRecordView[]> {
    const records = await this.collectionRecords.find({
      where: { collector_id: collectorId },
      order: { collected_at: 'DESC' },
    });
    return Promise.all(records.map((record) => this.toView(record)));
  }

  async listPendingReceiving(): Promise<CollectionRecordView[]> {
    const records = await this.collectionRecords
      .createQueryBuilder('cr')
      .leftJoin(
        TeaReceivingRecordEntity,
        'rr',
        'rr.collection_record_id = cr.id',
      )
      .where('rr.id IS NULL')
      .orderBy('cr.collected_at', 'ASC')
      .getMany();
    return Promise.all(records.map((record) => this.toView(record)));
  }

  async receive(
    id: number,
    input: ReceiveInput,
    officer: ReceivingOfficerContext,
  ): Promise<ReceiveResult> {
    const record = await this.collectionRecords.findOneBy({ id });
    if (!record) return { ok: false, error: 'Collection record not found' };

    const existing = await this.receivingRecords.findOneBy({
      collection_record_id: id,
    });
    const receiveCheck = canReceiveCollection(existing !== null);
    if (!receiveCheck.ok) return receiveCheck;
    const weightCheck = validateWeightKg(input.receivedWeightKg);
    if (!weightCheck.ok) return weightCheck;

    await this.receivingRecords.save(
      this.receivingRecords.create({
        collection_record_id: id,
        receiving_officer_id: officer.receivingOfficerId,
        factory_id: officer.factoryId,
        received_weight_kg: input.receivedWeightKg.toFixed(2),
        tea_grade: input.teaGrade,
      }),
    );

    if (record.pickup_request_id !== null) {
      await this.pickupRequests.update(
        { id: record.pickup_request_id },
        { status: 'completed', resolved_at: new Date() },
      );
    }

    let complaint: ComplaintView | null = null;
    const collectedKg = Number(record.actual_weight_kg);
    if (isWeightMismatch(collectedKg, input.receivedWeightKg)) {
      const estate = await this.estates.findOneBy({ id: record.estate_id });
      const saved = await this.complaints.save(
        this.complaints.create({
          type: 'weight_mismatch',
          raised_by_user_id: officer.raisedByUserId,
          collection_record_id: id,
          description: `Collected weight ${collectedKg}kg differs from factory weight ${input.receivedWeightKg}kg for estate ${estate?.name ?? record.estate_id}`,
        }),
      );
      const row = await this.complaints.findOneByOrFail({ id: saved.id });
      complaint = {
        id: row.id,
        type: row.type,
        raisedByUserId: row.raised_by_user_id,
        collectionRecordId: row.collection_record_id,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
      };
    }

    const updated = await this.collectionRecords.findOneByOrFail({ id });
    return { ok: true, record: await this.toView(updated), complaint };
  }

  async resolveCollectorIdForUser(userId: number): Promise<number | null> {
    const employee = await this.factoryEmployees.findOneBy({ user_id: userId });
    if (!employee) return null;
    const collector = await this.collectors.findOneBy({
      employee_id: employee.id,
    });
    return collector?.id ?? null;
  }

  async resolveReceivingOfficerForUser(
    userId: number,
  ): Promise<{ receivingOfficerId: number; factoryId: number } | null> {
    const employee = await this.factoryEmployees.findOneBy({ user_id: userId });
    if (!employee) return null;
    const officer = await this.receivingOfficers.findOneBy({
      employee_id: employee.id,
    });
    if (!officer) return null;
    return { receivingOfficerId: officer.id, factoryId: officer.factory_id };
  }
}
