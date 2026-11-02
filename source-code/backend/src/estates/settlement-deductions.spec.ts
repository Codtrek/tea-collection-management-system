import type { RepaymentFacts } from '../advances/installments';
import {
  allocateStoredAdvanceDeduction,
  planSettlementDeductions,
  type SettlementDeductionInput,
} from './settlement-deductions';

const plan = (
  id: string,
  amount: number,
  installment: number,
  startPeriod: string,
  dateIssued = '2026-11-01',
) => ({
  id,
  estateId: 1,
  amount: String(amount),
  installmentAmount: String(installment),
  startPeriod,
  dateIssued,
});

const base: SettlementDeductionInput = {
  period: 'December 2026',
  gross: 100000,
  adjustment: 0,
  transport: 8000,
  fertilizer: 12000,
  advances: [plan('EADV-1', 50000, 10000, 'December 2026')],
  recs: [],
  capPct: 50,
  order: ['transport', 'fertilizer', 'advances'],
};

describe('planSettlementDeductions (for the generator)', () => {
  it('takes each step in order; the installment fits', () => {
    const p = planSettlementDeductions(base);
    expect(p.taken).toEqual({
      transport: 8000,
      fertilizer: 12000,
      advances: 10000,
    });
    expect(p.carried).toEqual({ transport: 0, fertilizer: 0, advances: 0 });
    expect(p.net).toBe(70000);
  });

  it('carries forward the advance when the net is too small — net never below 0', () => {
    const p = planSettlementDeductions({ ...base, gross: 24000 });
    expect(p.taken).toEqual({
      transport: 8000,
      fertilizer: 12000,
      advances: 4000,
    });
    expect(p.advanceLines).toEqual([
      { advanceId: 'EADV-1', planned: 10000, amount: 4000 },
    ]);
    expect(p.carried.advances).toBe(6000);
    expect(p.net).toBe(0);
  });

  it('applies the cap % of gross to advances', () => {
    const p = planSettlementDeductions({
      ...base,
      transport: 0,
      fertilizer: 0,
      advances: [plan('EADV-1', 50000, 50000, 'December 2026')],
    });
    expect(p.taken.advances).toBe(50000);
    const capped = planSettlementDeductions({
      ...base,
      transport: 0,
      fertilizer: 0,
      capPct: 30,
      advances: [plan('EADV-1', 50000, 50000, 'December 2026')],
    });
    expect(capped.taken.advances).toBe(30000);
    expect(capped.carried.advances).toBe(20000);
  });

  it('follows the configured order — what comes last is what gets carried', () => {
    const short = { ...base, gross: 15000 };
    expect(planSettlementDeductions(short).taken).toEqual({
      transport: 8000,
      fertilizer: 7000,
      advances: 0,
    });
    const advancesFirst = planSettlementDeductions({
      ...short,
      order: ['advances', 'transport', 'fertilizer'],
    });
    expect(advancesFirst.taken).toEqual({
      advances: 7500,
      transport: 7500,
      fertilizer: 0,
    });
  });

  it('signed adjustments count before anything is deducted; advances not yet started are left alone', () => {
    const p = planSettlementDeductions({
      ...base,
      gross: 20000,
      adjustment: 4000,
      advances: [
        plan('EADV-1', 50000, 10000, 'December 2026'),
        plan('EADV-2', 9000, 9000, 'January 2027'),
      ],
    });
    expect(p.taken.advances).toBe(4000);
    expect(p.advanceLines.map((l) => l.advanceId)).toEqual(['EADV-1']);
  });
});

describe('allocateStoredAdvanceDeduction (Process today)', () => {
  it('splits the stored figure: due installments first, oldest first; the rest is carried', () => {
    const open = [
      plan('EADV-2', 30000, 30000, 'December 2026', '2026-11-20'),
      plan('EADV-1', 50000, 10000, 'December 2026', '2026-11-01'),
    ];
    const r = allocateStoredAdvanceDeduction(25000, open, [], 'December 2026');
    expect(r.lines).toEqual([
      { advanceId: 'EADV-1', planned: 10000, amount: 10000 },
      { advanceId: 'EADV-2', planned: 30000, amount: 15000 },
    ]);
    expect(r.unallocated).toBe(0);
  });

  it('an excess pays down the oldest balance (never above it); what no balance takes is reported', () => {
    const r = allocateStoredAdvanceDeduction(
      70000,
      [plan('EADV-1', 50000, 10000, 'December 2026')],
      [],
      'December 2026',
    );
    expect(r.lines).toEqual([
      { advanceId: 'EADV-1', planned: 10000, amount: 50000 },
    ]);
    expect(r.unallocated).toBe(20000);
  });

  it('a stored Rs. 0 records the due installment as carried forward, nothing recovered', () => {
    const r = allocateStoredAdvanceDeduction(
      0,
      [plan('EADV-1', 50000, 10000, 'December 2026')],
      [],
      'December 2026',
    );
    expect(r.lines).toEqual([
      { advanceId: 'EADV-1', planned: 10000, amount: 0 },
    ]);
  });

  it('an advance not due yet only takes money if there is an excess', () => {
    const later = plan('EADV-9', 20000, 5000, 'March 2027');
    expect(
      allocateStoredAdvanceDeduction(0, [later], [], 'December 2026').lines,
    ).toEqual([]);
    const recs: RepaymentFacts[] = [];
    expect(
      allocateStoredAdvanceDeduction(5000, [later], recs, 'December 2026')
        .lines,
    ).toEqual([{ advanceId: 'EADV-9', planned: 0, amount: 5000 }]);
  });
});
