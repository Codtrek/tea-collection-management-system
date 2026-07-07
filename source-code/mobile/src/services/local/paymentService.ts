import type { AsyncDb } from '@/db/asyncDb';
import { getDb } from '@/db';
import { DEFAULT_BANK_TRANSFER_FEE, calculateMonthlyPayment, validatePaymentRates } from '@/domain/payment';

import type { MonthlyPayment, PaymentActionResult, PaymentService, PaymentStatus } from '../types';

type MonthlyPaymentRow = {
  id: string;
  owner_id: string;
  factory_id: string;
  payment_month: string;
  super_weight_kg: number;
  normal_weight_kg: number;
  gross_amount: number;
  transport_cost: number;
  fertilizer_deductions: number;
  advance_deductions: number;
  bank_transfer_fee: number;
  net_amount: number;
  status: PaymentStatus;
  finalized_at: string | null;
};

function toMonthlyPayment(row: MonthlyPaymentRow): MonthlyPayment {
  return {
    id: row.id,
    ownerId: row.owner_id,
    factoryId: row.factory_id,
    paymentMonth: row.payment_month,
    superWeightKg: row.super_weight_kg,
    normalWeightKg: row.normal_weight_kg,
    grossAmount: row.gross_amount,
    transportCost: row.transport_cost,
    fertilizerDeductions: row.fertilizer_deductions,
    advanceDeductions: row.advance_deductions,
    bankTransferFee: row.bank_transfer_fee,
    netAmount: row.net_amount,
    status: row.status,
    finalizedAt: row.finalized_at,
  };
}

async function fetchPayment(db: AsyncDb, id: string): Promise<MonthlyPayment | null> {
  const row = await db.getFirstAsync<MonthlyPaymentRow>('SELECT * FROM monthly_payments WHERE id = ?', id);
  return row ? toMonthlyPayment(row) : null;
}

type MonthAggregates = {
  super_weight: number | null;
  normal_weight: number | null;
  transported_weight: number | null;
};

export function createLocalPaymentService(dbProvider: () => Promise<AsyncDb>): PaymentService {
  return {
    async generateForMonth(input): Promise<PaymentActionResult> {
      const db = await dbProvider();

      const ratesCheck = validatePaymentRates(input.superRatePerKg, input.normalRatePerKg);
      if (!ratesCheck.ok) return ratesCheck;

      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM monthly_payments WHERE owner_id = ? AND factory_id = ? AND payment_month = ?',
        input.ownerId,
        input.factoryId,
        input.paymentMonth,
      );
      if (existing) {
        return { ok: false, error: 'A payment for this owner and month already exists.' };
      }

      const aggregates = await db.getFirstAsync<MonthAggregates>(
        `SELECT
           SUM(CASE WHEN rr.tea_grade = 'super' THEN rr.received_weight_kg ELSE 0 END) AS super_weight,
           SUM(CASE WHEN rr.tea_grade = 'normal' THEN rr.received_weight_kg ELSE 0 END) AS normal_weight,
           SUM(CASE WHEN cr.self_delivered = 0 THEN rr.received_weight_kg ELSE 0 END) AS transported_weight
         FROM tea_receiving_records rr
         JOIN tea_collection_records cr ON cr.id = rr.collection_record_id
         JOIN estates e ON e.id = cr.estate_id
         WHERE e.owner_id = ? AND substr(rr.received_at, 1, 7) = ?`,
        input.ownerId,
        input.paymentMonth,
      );

      const superWeightKg = aggregates?.super_weight ?? 0;
      const normalWeightKg = aggregates?.normal_weight ?? 0;
      if (superWeightKg + normalWeightKg <= 0) {
        return { ok: false, error: 'No received tea collections found for this month.' };
      }

      const transportCost = (aggregates?.transported_weight ?? 0) * (input.transportRatePerKg ?? 0);
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

      const id = `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.runAsync(
        `INSERT INTO monthly_payments
          (id, owner_id, factory_id, payment_month, super_weight_kg, normal_weight_kg, gross_amount,
           transport_cost, fertilizer_deductions, advance_deductions, bank_transfer_fee, net_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        id,
        input.ownerId,
        input.factoryId,
        input.paymentMonth,
        superWeightKg,
        normalWeightKg,
        breakdown.grossAmount,
        transportCost,
        fertilizerDeductions,
        advanceDeductions,
        bankTransferFee,
        breakdown.netAmount,
      );

      const payment = await fetchPayment(db, id);
      if (!payment) throw new Error('Failed to create monthly payment');
      return { ok: true, payment };
    },

    async finalize(id): Promise<PaymentActionResult> {
      const db = await dbProvider();
      const payment = await fetchPayment(db, id);
      if (!payment) return { ok: false, error: 'Payment not found' };
      if (payment.status !== 'pending') {
        return { ok: false, error: 'Only pending payments can be finalized' };
      }
      await db.runAsync(
        "UPDATE monthly_payments SET status = 'finalized', finalized_at = ? WHERE id = ?",
        new Date().toISOString(),
        id,
      );
      return { ok: true, payment: (await fetchPayment(db, id))! };
    },

    async listForOwner(ownerId) {
      const db = await dbProvider();
      const rows = await db.getAllAsync<MonthlyPaymentRow>(
        'SELECT * FROM monthly_payments WHERE owner_id = ? ORDER BY payment_month DESC',
        ownerId,
      );
      return rows.map(toMonthlyPayment);
    },

    async listAll() {
      const db = await dbProvider();
      const rows = await db.getAllAsync<MonthlyPaymentRow>(
        'SELECT * FROM monthly_payments ORDER BY payment_month DESC',
      );
      return rows.map(toMonthlyPayment);
    },
  };
}

export const localPaymentService: PaymentService = createLocalPaymentService(getDb);
