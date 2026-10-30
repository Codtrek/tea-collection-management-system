import { computeGross, rateVersionFor } from './settlement-calc';

const v1 = { effectiveDate: '2026-01-01', superRate: 180, normalRate: 90 };
const v2 = { effectiveDate: '2026-07-01', superRate: 200, normalRate: 100 };

describe('settlement-calc', () => {
  describe('computeGross — per grade line × that grade’s rate', () => {
    it('prices each line at its own grade’s rate and sums them', () => {
      const { grossRs, lines } = computeGross(
        [
          { grade: 'super', weightKg: 32 },
          { grade: 'normal', weightKg: 12.5 },
        ],
        v1,
      );
      expect(lines).toEqual([
        { grade: 'super', weightKg: 32, rate: 180, amountRs: 5760 },
        { grade: 'normal', weightKg: 12.5, rate: 90, amountRs: 1125 },
      ]);
      expect(grossRs).toBe(6885);
    });

    it('an Ungraded delivery (no lines) earns nothing yet', () => {
      expect(computeGross([], v1).grossRs).toBe(0);
    });

    it('a multi-grade delivery is NOT priced as one blended weight', () => {
      const split = computeGross(
        [
          { grade: 'super', weightKg: 10 },
          { grade: 'normal', weightKg: 90 },
        ],
        v1,
      ).grossRs;
      const allSuper = computeGross(
        [{ grade: 'super', weightKg: 100 }],
        v1,
      ).grossRs;
      expect(split).toBe(10 * 180 + 90 * 90);
      expect(split).not.toBe(allSuper);
    });
  });

  describe('rateVersionFor — effective-dated, so past deliveries never reprice', () => {
    it('picks the newest version on or before the date', () => {
      expect(rateVersionFor([v1, v2], '2026-06-30')).toBe(v1);
      expect(rateVersionFor([v1, v2], '2026-07-01')).toBe(v2);
      expect(rateVersionFor([v2, v1], '2026-12-31')).toBe(v2);
    });

    it('returns null before any version took effect', () => {
      expect(rateVersionFor([v1, v2], '2025-12-31')).toBeNull();
    });

    it('a delivery from June keeps June’s rate after July’s version is published', () => {
      const june = computeGross(
        [{ grade: 'super', weightKg: 100 }],
        rateVersionFor([v1, v2], '2026-06-15')!,
      );
      expect(june.grossRs).toBe(18000);
    });
  });
});
