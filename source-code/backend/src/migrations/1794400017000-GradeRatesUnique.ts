import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-15-grade-rates-unique.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class GradeRatesUnique1794400017000 implements MigrationInterface {
  name = 'GradeRatesUnique1794400017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Grade-Rates-Addendum — one grade-rate version per effective date. Versions are never edited; a
-- second version on the same date would make "the rate in force on a date" ambiguous and could
-- reprice leaf already delivered. (The service also refuses back-dated versions.)

ALTER TABLE grade_rates DROP CONSTRAINT IF EXISTS grade_rates_effective_date_key;
ALTER TABLE grade_rates ADD CONSTRAINT grade_rates_effective_date_key UNIQUE (effective_date);
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE grade_rates DROP CONSTRAINT IF EXISTS grade_rates_effective_date_key`,
    );
  }
}
