import { DataSource } from 'typeorm';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { CollectionSettingsService } from '../collections/collection-settings.service';
import { DeliveryGradeLineEntity } from '../collections/delivery-grade-line.entity';
import { EstateEntity } from '../estates/estate.entity';
import { CollectionReportService } from './collection-report.service';

/*
  RPT-01 against a real database: the service's October 2026 figures must equal the direct SQL in
  docs/specs/Reports-Collection-Addendum.md §6. Opt-in, read-only:

    REPORT_SQL_CHECK_URL=postgresql://tea@localhost:5433/tea_dev npx jest collection-report.sql
*/
const URL = process.env.REPORT_SQL_CHECK_URL;
const MONTH = process.env.REPORT_SQL_CHECK_MONTH ?? '2026-10';

const SQL = `
WITH lines AS (
  SELECT delivery_id,
         sum(weight_kg) AS factory_kg,
         coalesce(sum(weight_kg) FILTER (WHERE grade = 'super'), 0) AS super_kg
    FROM delivery_grade_lines GROUP BY delivery_id
), d AS (
  SELECT r.id, r.weight_kg, l.factory_kg, l.super_kg,
         CASE WHEN r.provisional IS NOT NULL THEN 'provisional'
              WHEN r.status NOT IN ('collected', 'confirmed') THEN 'notDelivered'
              WHEN l.factory_kg IS NULL THEN 'ungraded'
              ELSE 'graded' END AS bucket
    FROM tea_collection_records r
    LEFT JOIN lines l ON l.delivery_id = r.id
   WHERE to_char(r.collection_date, 'YYYY-MM') = $1
)
SELECT count(*) FILTER (WHERE bucket = 'graded')                         AS graded,
       coalesce(sum(factory_kg) FILTER (WHERE bucket = 'graded'), 0)      AS factory_kg,
       coalesce(sum(weight_kg) FILTER (WHERE bucket = 'graded'), 0)       AS estate_kg,
       coalesce(sum(super_kg) FILTER (WHERE bucket = 'graded'), 0)        AS super_kg,
       count(*) FILTER (WHERE bucket = 'ungraded')                       AS ungraded,
       coalesce(sum(weight_kg) FILTER (WHERE bucket = 'ungraded'), 0)     AS ungraded_kg,
       count(*) FILTER (WHERE bucket = 'provisional')                    AS provisional
  FROM d`;

(URL ? describe : describe.skip)(`RPT-01 vs direct SQL (${MONTH})`, () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      url: URL,
      entities: [CollectionRecordEntity, DeliveryGradeLineEntity, EstateEntity],
    });
    await ds.initialize();
  });
  afterAll(() => ds?.destroy());

  it('page totals equal the SQL', async () => {
    const service = new CollectionReportService(
      ds.getRepository(CollectionRecordEntity),
      ds.getRepository(EstateEntity),
      {
        get: () => Promise.resolve({ mismatchTolerancePct: 5 }),
      } as unknown as CollectionSettingsService,
    );
    const [sql] = await ds.query<Record<string, string>[]>(SQL, [MONTH]);
    const page = await service.report({ month: MONTH });
    const num = (k: string) => Number(sql[k]);

    // printed so the comparison can be shown, not just asserted
    console.log(
      `${MONTH} SQL: ${num('graded')} graded · ${num('factory_kg')} kg factory · ${num('estate_kg')} kg estate · ` +
        `${num('ungraded')} ungraded (${num('ungraded_kg')} kg) · ${num('provisional')} provisional\n` +
        `${MONTH} page: ${page.cards.deliveries.value} graded · ${page.cards.factoryKg.value} kg factory · ` +
        `${page.cards.weightDiff.estateKg} kg estate · ${page.cards.deliveries.ungraded} ungraded ` +
        `(${page.cards.deliveries.ungradedEstateKg} kg) · ${page.cards.deliveries.provisional} provisional`,
    );
    expect(page.cards.deliveries.value).toBe(num('graded'));
    expect(page.cards.factoryKg.value).toBeCloseTo(num('factory_kg'), 2);
    expect(page.cards.weightDiff.estateKg).toBeCloseTo(num('estate_kg'), 2);
    expect(page.gradeSplit.superKg).toBeCloseTo(num('super_kg'), 2);
    expect(page.cards.deliveries.ungraded).toBe(num('ungraded'));
    expect(page.cards.deliveries.ungradedEstateKg).toBeCloseTo(
      num('ungraded_kg'),
      2,
    );
    expect(page.cards.deliveries.provisional).toBe(num('provisional'));
    expect(page.table.totals.factoryKg).toBeCloseTo(num('factory_kg'), 2);
  });
});
