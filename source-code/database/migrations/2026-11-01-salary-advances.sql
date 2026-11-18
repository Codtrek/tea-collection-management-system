-- ════════════════════════════════════════════════════════════════
-- Salary advances: decision reason, and which payroll month recovers each advance.
-- Spec: docs/specs/Salary-Advances-Addendum.md
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   psql -d tea_db -v ON_ERROR_STOP=1 -f source-code/database/migrations/2026-11-01-salary-advances.sql
-- ════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE salary_advances
    ADD COLUMN IF NOT EXISTS decision_reason  TEXT,
    ADD COLUMN IF NOT EXISTS payroll_period   VARCHAR(30),
    ADD COLUMN IF NOT EXISTS recovered_period VARCHAR(30);

-- An approved, not-yet-recovered advance already counted in a Pending payroll row is reserved
-- for that row's month (the earliest one, if an old generate counted it in several).
UPDATE salary_advances a
   SET payroll_period = (
         SELECT p.period FROM payroll_runs p
          WHERE p.employee_id = a.employee_id
            AND p.status = 'Pending'
            AND p.deductions_advances > 0
          ORDER BY to_date(p.period, 'FMMonth YYYY')
          LIMIT 1)
 WHERE a.status = 'Approved' AND NOT a.deducted AND a.payroll_period IS NULL;

-- A recovered advance: the latest processed month that deducted advances for that employee.
UPDATE salary_advances a
   SET recovered_period = (
         SELECT p.period FROM payroll_runs p
          WHERE p.employee_id = a.employee_id
            AND p.status = 'Processed'
            AND p.deductions_advances > 0
          ORDER BY to_date(p.period, 'FMMonth YYYY') DESC
          LIMIT 1),
       payroll_period = COALESCE(a.payroll_period, (
         SELECT p.period FROM payroll_runs p
          WHERE p.employee_id = a.employee_id
            AND p.status = 'Processed'
            AND p.deductions_advances > 0
          ORDER BY to_date(p.period, 'FMMonth YYYY') DESC
          LIMIT 1))
 WHERE a.deducted AND a.recovered_period IS NULL;

COMMIT;
