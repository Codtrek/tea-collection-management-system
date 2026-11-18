import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-01-payroll-filters.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class PayrollFilters1794400005000 implements MigrationInterface {
  name = 'PayrollFilters1794400005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- ════════════════════════════════════════════════════════════════
-- Payroll filters: the employee's payment method, and excluding a bank-paid row with no bank
-- details from a run with a required reason.
-- Spec: docs/specs/Payroll-Month-History-Addendum.md (Part C)
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   psql -d tea_db -v ON_ERROR_STOP=1 -f source-code/database/migrations/2026-11-01-payroll-filters.sql
-- ════════════════════════════════════════════════════════════════


ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) NOT NULL DEFAULT 'bank';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_payment_method_check') THEN
        ALTER TABLE employees
            ADD CONSTRAINT employees_payment_method_check CHECK (payment_method IN ('bank', 'cash'));
    END IF;
END $$;

ALTER TABLE payroll_runs
    ADD COLUMN IF NOT EXISTS excluded_reason TEXT,
    ADD COLUMN IF NOT EXISTS excluded_by     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS excluded_on     TIMESTAMP;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE payroll_runs DROP COLUMN IF EXISTS excluded_reason, DROP COLUMN IF EXISTS excluded_by, DROP COLUMN IF EXISTS excluded_on`,
    );
    await queryRunner.query(
      `ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_payment_method_check`,
    );
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS payment_method`,
    );
  }
}
