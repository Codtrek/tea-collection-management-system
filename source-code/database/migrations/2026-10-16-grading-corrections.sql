-- ════════════════════════════════════════════════════════════════
-- Grading corrections: OPEN / LOCKED / SETTLED states, grade-line revisions,
-- correction requests, settlement adjustments, and the owner-notification outbox.
-- Spec: docs/specs/Collection-Grading-Corrections-Addendum.md
--
-- Targeted migration (NOT a reset), idempotent, one transaction:
--   psql -d tea_db -v ON_ERROR_STOP=1 -f source-code/database/migrations/2026-10-16-grading-corrections.sql
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Delivery lifecycle columns ─────────────────────────────────────────────
-- graded_at   when the factory first saved the grading
-- locked_at   graded_at + the correction window AS IT WAS WHEN GRADED (a snapshot — never
--             recomputed from the current setting). NULL on a confirmed row = legacy = locked.
-- finalized_at set when the officer clicks Finalize (locked_at is pulled forward to it)
-- settlement_id the processed settlement that paid this delivery (set at process time)
ALTER TABLE tea_collection_records
    ADD COLUMN IF NOT EXISTS graded_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS locked_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS finalized_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS settlement_id VARCHAR(20) REFERENCES settlements(id);

-- Already-confirmed deliveries predate the window: they are locked as of their last update.
UPDATE tea_collection_records
   SET graded_at = COALESCE(last_updated_on, created_at),
       locked_at = COALESCE(last_updated_on, created_at)
 WHERE status = 'confirmed' AND graded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collection_records_settlement ON tea_collection_records(settlement_id);

-- ─── Signed adjustments carried into a settlement ───────────────────────────
ALTER TABLE settlements
    ADD COLUMN IF NOT EXISTS adjustment_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

-- ─── Grade-line revisions (append-only history) ─────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_grade_revisions (
    id          SERIAL PRIMARY KEY,
    delivery_id VARCHAR(20) NOT NULL REFERENCES tea_collection_records(id) ON DELETE CASCADE,
    revision_no INTEGER NOT NULL,
    kind        VARCHAR(20) NOT NULL CHECK (kind IN ('initial', 'open_edit', 'correction')),
    lines       JSONB NOT NULL,                 -- [{grade:'Super', weightKg: 32}, …]
    total_kg    DECIMAL(10,2) NOT NULL,
    reason      TEXT,
    changed_by  VARCHAR(100) NOT NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    request_id  INTEGER,
    UNIQUE (delivery_id, revision_no)
);
CREATE INDEX IF NOT EXISTS idx_grade_revisions_delivery ON delivery_grade_revisions(delivery_id);

-- ─── Correction requests (LOCKED / SETTLED deliveries) ──────────────────────
CREATE TABLE IF NOT EXISTS grade_correction_requests (
    id            SERIAL PRIMARY KEY,
    delivery_id   VARCHAR(20) NOT NULL REFERENCES tea_collection_records(id) ON DELETE CASCADE,
    lines         JSONB NOT NULL,               -- proposed lines
    reason        TEXT NOT NULL,
    status        VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by  VARCHAR(100) NOT NULL,
    requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_by    VARCHAR(100),
    decided_at    TIMESTAMPTZ,
    decision_note TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_correction_one_pending
    ON grade_correction_requests(delivery_id) WHERE status = 'pending';

-- ─── Settlement adjustments (a signed difference, never a rewrite of the past) ─
CREATE TABLE IF NOT EXISTS settlement_adjustments (
    id                    SERIAL PRIMARY KEY,
    estate_id             INTEGER NOT NULL REFERENCES estates(id),
    delivery_id           VARCHAR(20) NOT NULL REFERENCES tea_collection_records(id),
    request_id            INTEGER NOT NULL REFERENCES grade_correction_requests(id),
    origin_settlement_id  VARCHAR(20) NOT NULL REFERENCES settlements(id),
    super_kg_delta        DECIMAL(10,2) NOT NULL,
    normal_kg_delta       DECIMAL(10,2) NOT NULL,
    super_rate            DECIMAL(8,2) NOT NULL,   -- snapshotted from the paying settlement
    normal_rate           DECIMAL(8,2) NOT NULL,
    amount_rs             DECIMAL(12,2) NOT NULL,  -- signed
    status                VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied')),
    applied_settlement_id VARCHAR(20) REFERENCES settlements(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (request_id)
);
CREATE INDEX IF NOT EXISTS idx_adjustments_estate_status ON settlement_adjustments(estate_id, status);

-- ─── Owner notification outbox ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grading_notifications (
    id          SERIAL PRIMARY KEY,
    delivery_id VARCHAR(20) NOT NULL REFERENCES tea_collection_records(id) ON DELETE CASCADE,
    kind        VARCHAR(12) NOT NULL CHECK (kind IN ('graded', 'correction')),
    status      VARCHAR(10) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
    send_after  TIMESTAMPTZ NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    last_error  TEXT,
    sent_at     TIMESTAMPTZ,
    payload     JSONB,                          -- correction: {old:[…], new:[…], reason}
    dedupe_key  VARCHAR(80) NOT NULL UNIQUE,    -- 'graded:<delivery>' / 'correction:<request>'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grading_notifications_due ON grading_notifications(status, send_after);

-- Idempotent in-app rows: a retry after a crash can never store the same notification twice.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe ON notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('delivery_confirmation', 'otp', 'complaint',
                    'fertilizer_approval', 'payment_update',
                    'collection_complete', 'no_agents',
                    'cover_request', 'cover_response', 'missed_checkin',
                    'route_reassigned', 'exception_request',
                    'delivery_graded', 'grade_correction'));

-- ─── Permissions: two new data-driven modules (ADM-02) ──────────────────────
-- grading         view = see grading · edit = grade, edit while OPEN, finalize, request a correction
-- gradingApproval approve = approve / reject a correction (the `approve` tier implies edit,
--                 so approval is its own module — a Manager can approve without being able to grade)
INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'grading',         'view'),
    ('Officer',          'grading',         'edit'),
    ('Manager',          'grading',         'view'),
    ('ReceivingOfficer', 'grading',         'none'),
    ('Administrator',    'gradingApproval', 'view'),
    ('Officer',          'gradingApproval', 'view'),
    ('Manager',          'gradingApproval', 'approve'),
    ('ReceivingOfficer', 'gradingApproval', 'none')
ON CONFLICT (role, module) DO NOTHING;

-- ─── Collection settings (one key, same pattern as `dispatch`) ──────────────
INSERT INTO system_settings (key, value, updated_by)
VALUES ('collection',
        '{"correctionWindowMin": 30, "mismatchTolerancePct": 5, "usualRangeLow": 0.5, "usualRangeHigh": 2.0}'::jsonb,
        'migration 2026-10-16')
ON CONFLICT (key) DO NOTHING;

COMMIT;
