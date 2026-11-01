import {
  estateAdvanceOutstanding,
  recoveredOf,
  recoveryStatus,
  remainingOf,
} from './estate-advance-balance';

const adv = (id: string, estateId: number, amount: number) => ({
  id,
  estateId,
  amount: String(amount),
});
const rec = (advanceId: string, amount: number) => ({
  advanceId,
  amount: String(amount),
});

describe('estate-advance-balance', () => {
  const a = adv('EADV-1', 1, 50000);

  it('an advance with no recoveries is all remaining', () => {
    expect(recoveredOf('EADV-1', [])).toBe(0);
    expect(remainingOf(a, [])).toBe(50000);
    expect(recoveryStatus(a, [])).toBe('Pending deduction');
  });

  it('partial recoveries add up across settlements, only for that advance', () => {
    const rs = [
      rec('EADV-1', 20000),
      rec('EADV-1', 10000.5),
      rec('EADV-2', 999),
    ];
    expect(recoveredOf('EADV-1', rs)).toBe(30000.5);
    expect(remainingOf(a, rs)).toBe(19999.5);
    expect(recoveryStatus(a, rs)).toBe('Partly deducted');
  });

  it('fully recovered is Deducted with 0 remaining, never negative', () => {
    expect(recoveryStatus(a, [rec('EADV-1', 50000)])).toBe('Deducted');
    expect(remainingOf(a, [rec('EADV-1', 60000)])).toBe(0);
  });

  it('outstanding sums remaining per estate and leaves out settled estates', () => {
    const out = estateAdvanceOutstanding(
      [
        a,
        adv('EADV-2', 1, 10000),
        adv('EADV-3', 2, 30000),
        adv('EADV-4', 3, 5000),
      ],
      [rec('EADV-1', 20000), rec('EADV-4', 5000)],
    );
    expect(out.get(1)).toBe(40000);
    expect(out.get(2)).toBe(30000);
    expect(out.has(3)).toBe(false);
  });
});
