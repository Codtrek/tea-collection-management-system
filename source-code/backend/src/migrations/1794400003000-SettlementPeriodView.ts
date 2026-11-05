import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-01-settlement-period-view.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class SettlementPeriodView1794400003000 implements MigrationInterface {
  name = 'SettlementPeriodView1794400003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- ════════════════════════════════════════════════════════════════
-- Settlement period view: the estate owner's payment method (bank / cash).
-- Spec: docs/specs/Settlement-Period-View-Addendum.md
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   psql -d tea_db -v ON_ERROR_STOP=1 -f source-code/database/migrations/2026-11-01-settlement-period-view.sql
-- ════════════════════════════════════════════════════════════════


-- Every existing owner is paid by bank (the only method there was); cash is chosen per owner.
ALTER TABLE estates
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) NOT NULL DEFAULT 'bank';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estates_payment_method_check') THEN
        ALTER TABLE estates
            ADD CONSTRAINT estates_payment_method_check CHECK (payment_method IN ('bank', 'cash'));
    END IF;
END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE estates DROP CONSTRAINT IF EXISTS estates_payment_method_check`,
    );
    await queryRunner.query(
      `ALTER TABLE estates DROP COLUMN IF EXISTS payment_method`,
    );
  }
}
