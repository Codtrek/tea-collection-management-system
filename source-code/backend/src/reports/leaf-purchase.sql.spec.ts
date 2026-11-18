import { DataSource } from 'typeorm';
import { GradeRateEntity } from '../admin/grade-rate.entity';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { CollectionSettingsService } from '../collections/collection-settings.service';
import { DeliveryGradeLineEntity } from '../collections/delivery-grade-line.entity';
import { EstateEntity } from '../estates/estate.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { CollectionReportService } from './collection-report.service';
import type { FinanceService } from './finance.service';
import { LeafPurchaseService } from './leaf-purchase.service';

/*
  RPT-02 against a real database: the page's leaf value for a month must equal the direct SQL in
  the Reports addendum §9 (kg × the grade rate in force on each delivery date). Opt-in, read-only:

    REPORT_SQL_CHECK_URL=postgresql://tea@localhost:5433/tea_dev npx jest leaf-purchase.sql
*/
const URL = process.env.REPORT_SQL_CHECK_URL;
const MONTH = process.env.REPORT_SQL_CHECK_MONTH ?? '2026-10';

const SQL = `
WITH lines AS (
  SELECT delivery_id,
         coalesce(sum(weight_kg) FILTER (WHERE grade = 'super'), 0)  AS super_kg,
         coalesce(sum(weight_kg) FILTER (WHERE grade = 'normal'), 0) AS normal_kg
    FROM delivery_grade_lines GROUP BY delivery_id
), graded AS (
  SELECT r.id, r.collection_date, l.super_kg, l.normal_kg,
         (SELECT g.id FROM grade_rates g
           WHERE g.effective_date <= r.collection_date
           ORDER BY g.effective_date DESC LIMIT 1) AS rate_id
    FROM tea_collection_records r
    JOIN lines l ON l.delivery_id = r.id
   WHERE r.status IN ('collected', 'confirmed') AND r.provisional IS NULL
     AND to_char(r.collection_date, 'YYYY-MM') = $1
)
SELECT count(*) FILTER (WHERE d.rate_id IS NOT NULL)                                AS priced,
       coalesce(sum(round(d.super_kg * g.super_rate, 2) + round(d.normal_kg * g.normal_rate, 2)), 0) AS value_rs,
       coalesce(sum(d.super_kg + d.normal_kg) FILTER (WHERE d.rate_id IS NOT NULL), 0) AS factory_kg,
       count(*) FILTER (WHERE d.rate_id IS NULL)                                     AS no_rate
  FROM graded d LEFT JOIN grade_rates g ON g.id = d.rate_id`;

(URL ? describe : describe.skip)(`RPT-02 vs direct SQL (${MONTH})`, () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      url: URL,
      entities: [
        CollectionRecordEntity,
        DeliveryGradeLineEntity,
        EstateEntity,
        GradeRateEntity,
        SettlementEntity,
      ],
    });
    await ds.initialize();
  });
  afterAll(() => ds?.destroy());

  it('leaf value equals kg × the rate in force, by SQL', async () => {
    const collection = new CollectionReportService(
      ds.getRepository(CollectionRecordEntity),
      ds.getRepository(EstateEntity),
      {
        get: () => Promise.resolve({ mismatchTolerancePct: 5 }),
      } as unknown as CollectionSettingsService,
    );
    const finance = {
      rateVersions: () =>
        ds
          .getRepository(GradeRateEntity)
          .find()
          .then((rs) =>
            rs.map((r) => ({
              effectiveDate: r.effectiveDate,
              superRate: Number(r.superRate),
              normalRate: Number(r.normalRate),
            })),
          ),
      settlementRows: () => Promise.resolve([]),
    } as unknown as FinanceService;
    const service = new LeafPurchaseService(
      collection,
      finance,
      ds.getRepository(EstateEntity),
    );
    const [sql] = await ds.query<Record<string, string>[]>(SQL, [MONTH]);
    const page = await service.report({ month: MONTH });
    const num = (k: string) => Number(sql[k]);

    console.log(
      `${MONTH} SQL:  ${num('priced')} priced deliveries · Rs ${num('value_rs')} · ${num('factory_kg')} kg · ${num('no_rate')} without a rate\n` +
        `${MONTH} page: ${page.table.totals.deliveries} priced deliveries · Rs ${page.cards.leafValue.value} · ${page.table.totals.factoryKg} kg · ${page.cards.noRate.deliveries} without a rate`,
    );
    expect(page.table.totals.deliveries).toBe(num('priced'));
    expect(page.cards.leafValue.value).toBeCloseTo(num('value_rs'), 2);
    expect(page.table.totals.factoryKg).toBeCloseTo(num('factory_kg'), 2);
    expect(page.cards.noRate.deliveries).toBe(num('no_rate'));
    expect(
      page.cards.settlement.settledRs + page.cards.settlement.unsettledRs,
    ).toBeCloseTo(page.cards.leafValue.value, 2);
  });
});
