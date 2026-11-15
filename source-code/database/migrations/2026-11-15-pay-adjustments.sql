-- Administration-Addendum §8 (2026-11-15): pay adjustments. The Manager prepares a change (who,
-- % or Rs on all 4 hourly rates, optional rounding, effective date, reason); the Administrator
-- approves or rejects it. Nothing is applied before approval; on approval the new rates are
-- written to pay_rates (source 'adjustment'). Nobody approves their own change or one that
-- includes themselves. Each line keeps the old → new rates and the monthly cost change.
BEGIN;

CREATE TABLE IF NOT EXISTS pay_adjustments (
    id                    SERIAL PRIMARY KEY,
    status                VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    scope                 VARCHAR(10) NOT NULL CHECK (scope IN ('all', 'role', 'employees')),
    role                  VARCHAR(100),
    direction             VARCHAR(8) NOT NULL CHECK (direction IN ('increase', 'decrease')),
    kind                  VARCHAR(7) NOT NULL CHECK (kind IN ('percent', 'amount')),
    amount                DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    rounding              INTEGER NOT NULL DEFAULT 0 CHECK (rounding IN (0, 10, 50)),
    effective_date        DATE NOT NULL,
    reason                TEXT NOT NULL,
    decrease_agreement    BOOLEAN NOT NULL DEFAULT FALSE,
    total_monthly_change  DECIMAL(12,2) NOT NULL,
    requested_by          VARCHAR(100) NOT NULL,
    requested_by_user_id  INTEGER REFERENCES users(id),
    requested_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    decided_by            VARCHAR(100),
    decided_by_user_id    INTEGER REFERENCES users(id),
    decided_at            TIMESTAMP,
    decision_reason       TEXT
);

CREATE TABLE IF NOT EXISTS pay_adjustment_lines (
    id              SERIAL PRIMARY KEY,
    adjustment_id   INTEGER NOT NULL REFERENCES pay_adjustments(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id),
    employee_name   VARCHAR(100) NOT NULL,
    category        VARCHAR(10) NOT NULL,
    role            VARCHAR(100) NOT NULL,
    on_override     BOOLEAN NOT NULL,
    old_day_rate    DECIMAL(8,2) NOT NULL,
    old_day_ot_rate DECIMAL(8,2) NOT NULL,
    old_night_rate  DECIMAL(8,2) NOT NULL,
    old_night_ot_rate DECIMAL(8,2) NOT NULL,
    new_day_rate    DECIMAL(8,2) NOT NULL,
    new_day_ot_rate DECIMAL(8,2) NOT NULL,
    new_night_rate  DECIMAL(8,2) NOT NULL,
    new_night_ot_rate DECIMAL(8,2) NOT NULL,
    hours_basis     DECIMAL(8,2) NOT NULL,
    monthly_change  DECIMAL(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pay_adjustment_lines_adjustment ON pay_adjustment_lines(adjustment_id);

DO $$ BEGIN
    ALTER TABLE pay_rates ADD CONSTRAINT pay_rates_adjustment_fk
        FOREIGN KEY (adjustment_id) REFERENCES pay_adjustments(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
