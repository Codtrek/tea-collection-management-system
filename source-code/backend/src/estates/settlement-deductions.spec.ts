import { dueAdvances } from './settlement-deductions';

const plan = (
  id: string,
  startPeriod: string | null,
  dateIssued = '2026-11-01',
) => ({
  id,
  estateId: 1,
  amount: '50000',
  installmentAmount: '10000',
  startPeriod,
  dateIssued,
});

describe('dueAdvances', () => {
  it('takes advances started on or before the period, oldest first', () => {
    const due = dueAdvances(
      [
        plan('EADV-3', 'January 2027'),
        plan('EADV-2', 'December 2026', '2026-11-05'),
        plan('EADV-1', 'November 2026', '2026-10-20'),
      ],
      'December 2026',
    );
    expect(due.map((a) => a.id)).toEqual(['EADV-1', 'EADV-2']);
  });

  it('an advance with no start period starts the month after it was issued', () => {
    expect(
      dueAdvances([plan('A', null, '2026-11-20')], 'November 2026'),
    ).toEqual([]);
    expect(
      dueAdvances([plan('A', null, '2026-11-20')], 'December 2026'),
    ).toHaveLength(1);
  });
});
