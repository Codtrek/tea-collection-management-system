import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-06-holiday-import.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class HolidayImport1794400013000 implements MigrationInterface {
  name = 'HolidayImport1794400013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Attendance-Leave-Addendum §4.5 — Sri Lanka holidays imported from Google's public calendar.
--   • holiday_import_skips: events the Administrator unticked, so a re-sync doesn't offer them again
--   (holidays.source / external_uid / imported_at came with 2026-11-06-holiday-approvals.sql)

CREATE TABLE IF NOT EXISTS holiday_import_skips (
    id         SERIAL PRIMARY KEY,
    uid        VARCHAR(200) NOT NULL UNIQUE,   -- the iCal UID
    year       INTEGER NOT NULL,
    name       VARCHAR(100) NOT NULL,
    date       DATE NOT NULL,
    skipped_by VARCHAR(100),
    skipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_holiday_import_skips_year ON holiday_import_skips(year);
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS holiday_import_skips`);
  }
}
