-- Attendance-Leave-Addendum §4 — holiday permissions and the approval flow.
--   • holidayCalendar: Administrator approve (was view), Manager edit, Officer view
--   • holidayStatutory (new): Poya / public holidays, type settings, the Google import —
--     Administrator only; everyone else views
--   • holidays: who created it (user id, for "only their own"), where it came from
--   • holiday_requests: Manager proposals / requests waiting for the Administrator, and
--     emergency closures waiting for review (keep or revert)
--   • notifications: holiday_request (to the Administrator / back to the requester),
--     holiday_cancelled (to agents when a reverted closure gives their route day back)
BEGIN;

UPDATE role_permissions SET level = 'approve'
WHERE role = 'Administrator' AND module = 'holidayCalendar';

INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'holidayStatutory', 'approve'),
    ('Officer',          'holidayStatutory', 'view'),
    ('Manager',          'holidayStatutory', 'view'),
    ('ReceivingOfficer', 'holidayStatutory', 'none')
ON CONFLICT (role, module) DO NOTHING;

ALTER TABLE holidays
    ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS source             VARCHAR(10) NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS external_uid       VARCHAR(200),
    ADD COLUMN IF NOT EXISTS imported_at        TIMESTAMPTZ;
ALTER TABLE holidays DROP CONSTRAINT IF EXISTS holidays_source_check;
ALTER TABLE holidays ADD CONSTRAINT holidays_source_check CHECK (source IN ('manual', 'google', 'file'));
CREATE INDEX IF NOT EXISTS idx_holidays_external_uid ON holidays(external_uid);

CREATE TABLE IF NOT EXISTS holiday_requests (
    id                   SERIAL PRIMARY KEY,
    kind                 VARCHAR(12) NOT NULL CHECK (kind IN ('weekly_rule', 'closure', 'emergency')),
    status               VARCHAR(10) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected', 'kept', 'reverted')),
    payload              JSONB NOT NULL,          -- the DTO as requested
    date_from            DATE NOT NULL,           -- for the calendar's "Awaiting approval" chips
    date_to              DATE NOT NULL,
    requested_by         VARCHAR(100) NOT NULL,
    requested_by_user_id INTEGER REFERENCES users(id),
    requested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_by           VARCHAR(100),
    decided_at           TIMESTAMPTZ,
    decision_reason      TEXT,
    declare_group        UUID,                    -- the holidays it created (emergency / approved closure)
    snapshot             JSONB                    -- attendance as it was before (emergency revert)
);
CREATE INDEX IF NOT EXISTS idx_holiday_requests_status ON holiday_requests(status);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'delivery_confirmation', 'otp', 'complaint', 'fertilizer_approval', 'payment_update',
    'collection_complete', 'no_agents', 'cover_request', 'cover_response', 'missed_checkin',
    'route_reassigned', 'exception_request', 'delivery_graded', 'grade_correction',
    'fertilizer_update', 'holiday_declared', 'holiday_request', 'holiday_cancelled'));

COMMIT;
