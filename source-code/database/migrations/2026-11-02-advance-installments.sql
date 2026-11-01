-- ════════════════════════════════════════════════════════════════
-- Advance installments: repayment plan, requester (no self-approval), reschedules, leavers.
-- Spec: docs/specs/Salary-Advances-Addendum.md (§10). Apply AFTER 2026-11-02-advance-recoveries.sql.
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   psql -d tea_db -v ON_ERROR_STOP=1 -f source-code/database/migrations/2026-11-02-advance-installments.sql
-- ════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE salary_advances
    ADD COLUMN IF NOT EXISTS installment_amount   DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS installment_months   INTEGER,
    ADD COLUMN IF NOT EXISTS start_period         VARCHAR(30),
    ADD COLUMN IF NOT EXISTS requested_by_user_id INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS requested_by_name    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS plan_change_note     TEXT;

-- Existing advances keep today's behaviour: one deduction of the whole amount.
UPDATE salary_advances
   SET installment_amount = amount, installment_months = 1
 WHERE installment_amount IS NULL;
-- …starting in the month that already reserved / recovered it (Part B), when there is one.
UPDATE salary_advances
   SET start_period = COALESCE(recovered_period, payroll_period)
 WHERE start_period IS NULL AND COALESCE(recovered_period, payroll_period) IS NOT NULL;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS deactivated_on DATE;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS advance_reschedules (
    id                   SERIAL PRIMARY KEY,
    advance_id           VARCHAR(20) NOT NULL REFERENCES salary_advances(id) ON DELETE CASCADE,
    installment_amount   DECIMAL(12,2) NOT NULL CHECK (installment_amount > 0),
    start_period         VARCHAR(30) NOT NULL,
    note                 TEXT NOT NULL,
    status               VARCHAR(10) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    requested_by_user_id INTEGER REFERENCES users(id),
    requested_by_name    VARCHAR(100),
    decided_by           VARCHAR(100),
    decided_on           TIMESTAMP,
    decision_reason      TEXT,
    created_at           TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_advance_reschedules_advance ON advance_reschedules(advance_id);

COMMIT;
