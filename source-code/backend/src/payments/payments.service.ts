import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TeaCollectionRecordEntity } from '../collection-records/entities/tea-collection-record.entity';
import { TeaReceivingRecordEntity } from '../collection-records/entities/tea-receiving-record.entity';
import { EstateEntity } from '../routes/entities/estate.entity';
import { TeaEstateOwnerEntity } from '../routes/entities/tea-estate-owner.entity';
import { MonthlyPaymentEntity } from './entities/monthly-payment.entity';
import {
  DEFAULT_BANK_TRANSFER_FEE,
  calculateMonthlyPayment,
  validatePaymentRates,
} from './payment-calculation.util';

export type MonthlyPaymentView = {
  id: number;
  ownerId: number;
  factoryId: number;
  paymentMonth: string;
  superWeightKg: number;
  normalWeightKg: number;
  grossAmount: number;
  transportCost: number;
  fertilizerDeductions: number;
  advanceDeductions: number;
  bankTransferFee: number;
  netAmount: number;
  status: MonthlyPaymentEntity['status'];
  finalizedAt: Date | null;
};

export type GeneratePaymentInput = {
  ownerId: number;
  factoryId: number;
  paymentMonth: string;
  superRatePerKg: number;
  normalRatePerKg: number;
  transportRatePerKg?: number;
  fertilizerDeductions?: number;
  advanceDeductions?: number;
  bankTransferFee?: number;
};

export type GeneratePaymentResult =
  | { ok: true; payment: MonthlyPaymentView }
  | { ok: false; error: string };

export type FinalizePaymentResult =
  | { ok: true; payment: MonthlyPaymentView }
  | { ok: false; error: string };

type WeightAggregates = {
  super_weight: string | null;
  normal_weight: string | null;
  transported_weight: string | null;
};

function toView(entity: MonthlyPaymentEntity): MonthlyPaymentView {
  return {
    id: entity.id,
    ownerId: entity.owner_id,
    factoryId: entity.factory_id,
    paymentMonth: entity.payment_month.slice(0, 7),
    superWeightKg: Number(entity.super_weight_kg),
    normalWeightKg: Number(entity.normal_weight_kg),
    grossAmount: Number(entity.gross_amount),
    transportCost: Number(entity.transport_cost),
    fertilizerDeductions: Number(entity.fertilizer_deductions),
    advanceDeductions: Number(entity.advance_deductions),
    bankTransferFee: Number(entity.bank_transfer_fee),
    netAmount: Number(entity.net_amount),
    status: entity.status,
    finalizedAt: entity.finalized_at,
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(MonthlyPaymentEntity)
    private readonly monthlyPayments: Repository<MonthlyPaymentEntity>,
    @InjectRepository(TeaReceivingRecordEntity)
    private readonly receivingRecords: Repository<TeaReceivingRecordEntity>,
    @InjectRepository(TeaCollectionRecordEntity)
    private readonly collectionRecords: Repository<TeaCollectionRecordEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    @InjectRepository(TeaEstateOwnerEntity)
    private readonly teaEstateOwners: Repository<TeaEstateOwnerEntity>,
  ) {}

  async generateForMonth(
    input: GeneratePaymentInput,
  ): Promise<GeneratePaymentResult> {
    const ratesCheck = validatePaymentRates(
      input.superRatePerKg,
      input.normalRatePerKg,
    );
    if (!ratesCheck.ok) return ratesCheck;

    const paymentMonthDate = `${input.paymentMonth}-01`;
    const existing = await this.monthlyPayments.findOne({
      where: {
        owner_id: input.ownerId,
        factory_id: input.factoryId,
        payment_month: paymentMonthDate,
      },
    });
    if (existing) {
      return {
        ok: false,
        error: 'A payment for this owner and month already exists.',
      };
    }

    const aggregates = await this.receivingRecords
      .createQueryBuilder('rr')
      .innerJoin(
        TeaCollectionRecordEntity,
        'cr',
        'cr.id = rr.collection_record_id',
      )
      .innerJoin(EstateEntity, 'e', 'e.id = cr.estate_id')
      .select(
        "SUM(CASE WHEN rr.tea_grade = 'super' THEN rr.received_weight_kg ELSE 0 END)",
        'super_weight',
      )
      .addSelect(
        "SUM(CASE WHEN rr.tea_grade = 'normal' THEN rr.received_weight_kg ELSE 0 END)",
        'normal_weight',
      )
      .addSelect(
        'SUM(CASE WHEN cr.self_delivered = false THEN rr.received_weight_kg ELSE 0 END)',
        'transported_weight',
      )
      .where('e.owner_id = :ownerId', { ownerId: input.ownerId })
      .andWhere("TO_CHAR(rr.received_at, 'YYYY-MM') = :month", {
        month: input.paymentMonth,
      })
      .getRawOne<WeightAggregates>();

    const superWeightKg = Number(aggregates?.super_weight ?? 0);
    const normalWeightKg = Number(aggregates?.normal_weight ?? 0);
    if (superWeightKg + normalWeightKg <= 0) {
      return {
        ok: false,
        error: 'No received tea collections found for this month.',
      };
    }

    const transportCost =
      Number(aggregates?.transported_weight ?? 0) *
      (input.transportRatePerKg ?? 0);
    const fertilizerDeductions = input.fertilizerDeductions ?? 0;
    const advanceDeductions = input.advanceDeductions ?? 0;
    const bankTransferFee = input.bankTransferFee ?? DEFAULT_BANK_TRANSFER_FEE;

    const breakdown = calculateMonthlyPayment({
      superWeightKg,
      normalWeightKg,
      superRatePerKg: input.superRatePerKg,
      normalRatePerKg: input.normalRatePerKg,
      transportCost,
      fertilizerDeductions,
      advanceDeductions,
      bankTransferFee,
    });

    const inserted = await this.monthlyPayments.save(
      this.monthlyPayments.create({
        factory_id: input.factoryId,
        owner_id: input.ownerId,
        payment_month: paymentMonthDate,
        super_weight_kg: superWeightKg.toFixed(2),
        normal_weight_kg: normalWeightKg.toFixed(2),
        gross_amount: breakdown.grossAmount.toFixed(2),
        transport_cost: transportCost.toFixed(2),
        fertilizer_deductions: fertilizerDeductions.toFixed(2),
        advance_deductions: advanceDeductions.toFixed(2),
        bank_transfer_fee: bankTransferFee.toFixed(2),
        net_amount: breakdown.netAmount.toFixed(2),
      }),
    );

    const payment = await this.monthlyPayments.findOneByOrFail({
      id: inserted.id,
    });
    return { ok: true, payment: toView(payment) };
  }

  async finalize(id: number): Promise<FinalizePaymentResult> {
    const payment = await this.monthlyPayments.findOneBy({ id });
    if (!payment) return { ok: false, error: 'Payment not found' };
    if (payment.status !== 'pending') {
      return { ok: false, error: 'Only pending payments can be finalized' };
    }
    await this.monthlyPayments.update(
      { id },
      { status: 'finalized', finalized_at: new Date() },
    );
    const updated = await this.monthlyPayments.findOneByOrFail({ id });
    return { ok: true, payment: toView(updated) };
  }

  async listForOwner(ownerId: number): Promise<MonthlyPaymentView[]> {
    const rows = await this.monthlyPayments.find({
      where: { owner_id: ownerId },
      order: { payment_month: 'DESC' },
    });
    return rows.map(toView);
  }

  async listAll(): Promise<MonthlyPaymentView[]> {
    const rows = await this.monthlyPayments.find({
      order: { payment_month: 'DESC' },
    });
    return rows.map(toView);
  }

  async resolveOwnerIdForUser(userId: number): Promise<number | null> {
    const owner = await this.teaEstateOwners.findOne({
      where: { user_id: userId },
    });
    return owner?.id ?? null;
  }
}
