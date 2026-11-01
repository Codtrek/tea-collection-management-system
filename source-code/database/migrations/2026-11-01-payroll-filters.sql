-- ════════════════════════════════════════════════════════════════
-- Payroll filters: the employee's payment method, and excluding a bank-paid row with no bank
-- details from a run with a required reason.
-- Spec: docs/specs/Payroll-Month-History-Addendum.md (Part C)
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   psql -d tea_db -v ON_ERROR_STOP=1 -f source-code/database/migrations/2026-11-01-payroll-filters.sql
-- ════════════════════════════════════════════════════════════════

BEGIN;

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

COMMIT;
