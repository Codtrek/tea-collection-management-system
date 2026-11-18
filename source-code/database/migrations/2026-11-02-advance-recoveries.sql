-- ════════════════════════════════════════════════════════════════
-- Advance recoveries: deduct what the gross allows, carry the rest forward.
-- Spec: docs/specs/Salary-Advances-Addendum.md (§9)
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   psql -d tea_db -v ON_ERROR_STOP=1 -f source-code/database/migrations/2026-11-02-advance-recoveries.sql
-- ════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS advance_recoveries (
    id             SERIAL PRIMARY KEY,
    advance_id     VARCHAR(20) NOT NULL REFERENCES salary_advances(id) ON DELETE CASCADE,
    kind           VARCHAR(10) NOT NULL DEFAULT 'payroll' CHECK (kind IN ('payroll', 'cash')),
    period         VARCHAR(30),
    payroll_run_id VARCHAR(20) REFERENCES payroll_runs(id) ON DELETE SET NULL,
    status         VARCHAR(10) NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'recovered')),
    planned_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount         DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    reference      VARCHAR(100),
    paid_on        DATE,
    recorded_by    VARCHAR(100),
    created_at     TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_advance_recoveries_month
    ON advance_recoveries(advance_id, period) WHERE kind = 'payroll';
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_advance ON advance_recoveries(advance_id);

-- Part B's single reservation / recovery becomes a recovery row (the whole amount, as before).
INSERT INTO advance_recoveries (advance_id, kind, period, payroll_run_id, status, planned_amount, amount)
SELECT a.id, 'payroll', COALESCE(a.recovered_period, a.payroll_period), p.id,
       CASE WHEN a.deducted THEN 'recovered' ELSE 'reserved' END, a.amount, a.amount
  FROM salary_advances a
  LEFT JOIN payroll_runs p
         ON p.employee_id = a.employee_id AND p.period = COALESCE(a.recovered_period, a.payroll_period)
 WHERE a.status = 'Approved'
   AND COALESCE(a.recovered_period, a.payroll_period) IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
