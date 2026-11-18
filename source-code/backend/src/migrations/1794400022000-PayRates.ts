import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-15-pay-rates.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class PayRates1794400022000 implements MigrationInterface {
  name = 'PayRates1794400022000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Administration-Addendum §6 (2026-11-15): pay history. Pay is the 4 HOURLY rates (day, day-OT,
-- night, night-OT), effective-dated per ROLE (the default) with a per-EMPLOYEE override. An
-- employee's pay on a date = their override in force that day, else their role's rate. Payroll
-- prices each attendance day at the rates in force that day; processed runs keep their snapshot.
-- Rows are inserted, never edited. Migrated from the rates on record, effective 2019-01-01 (before
-- any data), so nothing is priced differently.

CREATE TABLE IF NOT EXISTS pay_rates (
    id             SERIAL PRIMARY KEY,
    scope          VARCHAR(8) NOT NULL CHECK (scope IN ('role', 'employee')),
    role           VARCHAR(100),
    employee_id    INTEGER REFERENCES employees(id),
    effective_date DATE NOT NULL,
    day_rate       DECIMAL(8,2) NOT NULL CHECK (day_rate >= 0),
    day_ot_rate    DECIMAL(8,2) NOT NULL CHECK (day_ot_rate >= 0),
    night_rate     DECIMAL(8,2) NOT NULL CHECK (night_rate >= 0),
    night_ot_rate  DECIMAL(8,2) NOT NULL CHECK (night_ot_rate >= 0),
    reason         TEXT NOT NULL,
    set_by         VARCHAR(100) NOT NULL,
    source         VARCHAR(12) NOT NULL CHECK (source IN ('migration', 'registration', 'adjustment')),
    adjustment_id  INTEGER,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK ((scope = 'role' AND role IS NOT NULL AND employee_id IS NULL)
        OR (scope = 'employee' AND employee_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS pay_rates_role_date_key ON pay_rates (role, effective_date) WHERE scope = 'role';
CREATE UNIQUE INDEX IF NOT EXISTS pay_rates_employee_date_key ON pay_rates (employee_id, effective_date) WHERE scope = 'employee';

-- role defaults: each role's most common rate set
INSERT INTO pay_rates (scope, role, effective_date, day_rate, day_ot_rate, night_rate, night_ot_rate, reason, set_by, source)
SELECT 'role', m.role, DATE '2019-01-01', m.day_rate, m.day_ot_rate, m.night_rate, m.night_ot_rate,
       'Rates on record when pay history started', 'migration 2026-11-15', 'migration'
  FROM (SELECT role, day_rate, day_ot_rate, night_rate, night_ot_rate,
               row_number() OVER (PARTITION BY role ORDER BY count(*) DESC, min(id)) AS rk
          FROM employees
         GROUP BY role, day_rate, day_ot_rate, night_rate, night_ot_rate) m
 WHERE m.rk = 1
   AND NOT EXISTS (SELECT 1 FROM pay_rates p WHERE p.scope = 'role' AND p.role = m.role);

-- overrides: employees whose rates differ from their role's default
INSERT INTO pay_rates (scope, employee_id, effective_date, day_rate, day_ot_rate, night_rate, night_ot_rate, reason, set_by, source)
SELECT 'employee', e.id, DATE '2019-01-01', e.day_rate, e.day_ot_rate, e.night_rate, e.night_ot_rate,
       'Rates on record when pay history started (different from the role rate)', 'migration 2026-11-15', 'migration'
  FROM employees e
  JOIN pay_rates r ON r.scope = 'role' AND r.role = e.role AND r.effective_date = DATE '2019-01-01'
 WHERE (e.day_rate, e.day_ot_rate, e.night_rate, e.night_ot_rate)
       IS DISTINCT FROM (r.day_rate, r.day_ot_rate, r.night_rate, r.night_ot_rate)
   AND NOT EXISTS (SELECT 1 FROM pay_rates p WHERE p.scope = 'employee' AND p.employee_id = e.id);

-- payRates: the Manager prepares pay changes, the Administrator approves; Officers don't see pay rates.
INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'payRates', 'approve'),
    ('Officer',          'payRates', 'none'),
    ('Manager',          'payRates', 'edit'),
    ('ReceivingOfficer', 'payRates', 'none')
ON CONFLICT (role, module) DO NOTHING;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE module = 'payRates'`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS pay_rates`);
  }
}
