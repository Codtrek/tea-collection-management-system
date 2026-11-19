-- ════════════════════════════════════════════════════════════════
-- Settlement period view: the estate owner's payment method (bank / cash).
-- Spec: docs/specs/Settlement-Period-View-Addendum.md
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   psql -d tea_db -v ON_ERROR_STOP=1 -f source-code/database/migrations/2026-11-01-settlement-period-view.sql
-- ════════════════════════════════════════════════════════════════

BEGIN;

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

COMMIT;
