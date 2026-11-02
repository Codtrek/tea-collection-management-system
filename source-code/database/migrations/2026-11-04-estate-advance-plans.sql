-- Estate-Owner-Advances-Addendum §4 — repayment plans for estate owner advances, on the same
-- installment model as salary advances (backend/src/advances/installments.ts).
--   • estate_advances: the plan (installment, months, start period) + a 'recovering' status
--   • estate_advance_recoveries: one row per settlement period (planned vs actually deducted, so a
--     short period shows its carry-forward) or per early cash / bank repayment
--   • estate_advance_reschedules: plan changes, approved by someone other than the requester
--   • system_settings.estateAdvances: cap %, max months, warn %, deduction order
BEGIN;

ALTER TABLE estate_advances
    ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS installment_months INTEGER,
    ADD COLUMN IF NOT EXISTS start_period       VARCHAR(30);
ALTER TABLE estate_advances DROP CONSTRAINT IF EXISTS estate_advances_status_check;
ALTER TABLE estate_advances ADD CONSTRAINT estate_advances_status_check
    CHECK (status IN ('pending_deduction', 'recovering', 'deducted'));

-- Existing advances = one-deduction plans, starting at the settlement already set up for them:
-- the estate's first settlement on or after the issue month (else the next calendar month).
UPDATE estate_advances a
   SET installment_amount = a.amount,
       installment_months = 1,
       start_period = COALESCE(
           (SELECT s.period FROM settlements s
             WHERE s.estate_id = a.estate_id
               AND to_date(s.period, 'FMMonth YYYY') >= date_trunc('month', a.date_issued)
             ORDER BY to_date(s.period, 'FMMonth YYYY') LIMIT 1),
           trim(to_char(a.date_issued + INTERVAL '1 month', 'FMMonth YYYY')))
 WHERE a.start_period IS NULL;

ALTER TABLE estate_advance_recoveries
    ADD COLUMN IF NOT EXISTS kind           VARCHAR(12) NOT NULL DEFAULT 'settlement',
    ADD COLUMN IF NOT EXISTS period         VARCHAR(30),
    ADD COLUMN IF NOT EXISTS planned_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status         VARCHAR(10) NOT NULL DEFAULT 'recovered',
    ADD COLUMN IF NOT EXISTS reference      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS paid_on        DATE,
    ADD COLUMN IF NOT EXISTS recorded_by    VARCHAR(100);
ALTER TABLE estate_advance_recoveries ALTER COLUMN settlement_id DROP NOT NULL;
ALTER TABLE estate_advance_recoveries DROP CONSTRAINT IF EXISTS estate_advance_recoveries_amount_check;
ALTER TABLE estate_advance_recoveries ADD CONSTRAINT estate_advance_recoveries_amount_check CHECK (amount >= 0);
ALTER TABLE estate_advance_recoveries DROP CONSTRAINT IF EXISTS estate_advance_recoveries_kind_check;
ALTER TABLE estate_advance_recoveries ADD CONSTRAINT estate_advance_recoveries_kind_check
    CHECK (kind IN ('settlement', 'cash', 'bank'));
ALTER TABLE estate_advance_recoveries DROP CONSTRAINT IF EXISTS estate_advance_recoveries_status_check;
ALTER TABLE estate_advance_recoveries ADD CONSTRAINT estate_advance_recoveries_status_check
    CHECK (status IN ('reserved', 'recovered'));

-- The one existing recovery (EADV-2026-0022 by SET-2026-06-003) gets its period + planned amount.
UPDATE estate_advance_recoveries r
   SET period = s.period, planned_amount = r.amount
  FROM settlements s
 WHERE s.id = r.settlement_id AND r.period IS NULL AND r.kind = 'settlement';

CREATE TABLE IF NOT EXISTS estate_advance_reschedules (
    id                   SERIAL PRIMARY KEY,
    advance_id           VARCHAR(20) NOT NULL REFERENCES estate_advances(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_estate_advance_reschedules_advance ON estate_advance_reschedules(advance_id);

INSERT INTO system_settings (key, value, updated_by)
VALUES ('estateAdvances',
        '{"deductionCapPct": 50, "maxInstallmentMonths": 6, "netWarnPct": 50, "deductionOrder": ["transport", "fertilizer", "advances"]}'::jsonb,
        'migration 2026-11-04')
ON CONFLICT (key) DO NOTHING;

COMMIT;
