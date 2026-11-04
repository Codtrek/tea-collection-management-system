-- Attendance-Leave-Addendum Phase 1 — attendance rules, the holiday calendar, one record with
-- Agent Dispatch.
--   • employee_attendance: half-day AM/PM, short-leave times, worked-on-holiday flag, who/when/
--     where marked, the reason for an older-day edit; status gains 'Short leave'
--   • employees.category (factory | office) — policies and the weekly holiday are per category
--   • holiday_types / holidays / weekly_holiday_rules / employee_rest_days — the calendar
--   • holidayCalendar permission (Manager edit, Administrator + Officer view)
BEGIN;

ALTER TABLE employee_attendance
    ADD COLUMN IF NOT EXISTS half             VARCHAR(2),
    ADD COLUMN IF NOT EXISTS short_out        TIME,
    ADD COLUMN IF NOT EXISTS short_back       TIME,
    ADD COLUMN IF NOT EXISTS holiday_worked   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS leave_request_id INTEGER,
    ADD COLUMN IF NOT EXISTS marked_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS edit_reason      TEXT,
    ADD COLUMN IF NOT EXISTS source           VARCHAR(10) NOT NULL DEFAULT 'portal';
ALTER TABLE employee_attendance DROP CONSTRAINT IF EXISTS employee_attendance_status_check;
ALTER TABLE employee_attendance ADD CONSTRAINT employee_attendance_status_check
    CHECK (status IN ('Present', 'Absent', 'Leave', 'Half-day', 'Short leave'));
ALTER TABLE employee_attendance DROP CONSTRAINT IF EXISTS employee_attendance_half_check;
ALTER TABLE employee_attendance ADD CONSTRAINT employee_attendance_half_check
    CHECK (half IS NULL OR half IN ('AM', 'PM'));
ALTER TABLE employee_attendance DROP CONSTRAINT IF EXISTS employee_attendance_source_check;
ALTER TABLE employee_attendance ADD CONSTRAINT employee_attendance_source_check
    CHECK (source IN ('portal', 'dispatch', 'app', 'leave', 'holiday'));
UPDATE employee_attendance SET marked_at = created_at WHERE marked_at IS NULL;

-- Category: office staff (Shop & Office Act) vs factory workers (Wages Board).
ALTER TABLE employees ADD COLUMN IF NOT EXISTS category VARCHAR(10) NOT NULL DEFAULT 'factory';
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_category_check;
ALTER TABLE employees ADD CONSTRAINT employees_category_check CHECK (category IN ('factory', 'office'));
UPDATE employees SET category = 'office' WHERE role IN ('Factory Officer', 'Factory Manager');

-- Paid / work-allowed defaults per holiday type (the Manager edits these).
CREATE TABLE IF NOT EXISTS holiday_types (
    type         VARCHAR(10) PRIMARY KEY CHECK (type IN ('poya', 'public', 'weekly', 'closure')),
    label        VARCHAR(40) NOT NULL,
    paid         BOOLEAN NOT NULL,
    work_allowed BOOLEAN NOT NULL,
    updated_by   VARCHAR(100),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO holiday_types (type, label, paid, work_allowed) VALUES
    ('poya',    'Poya day',            TRUE,  TRUE),
    ('public',  'Public holiday',      TRUE,  TRUE),
    ('weekly',  'Weekly holiday',      FALSE, TRUE),
    ('closure', 'Factory closure',     FALSE, FALSE)
ON CONFLICT (type) DO NOTHING;

-- Dated holidays: Poya / public (entered per year) and declared closures.
CREATE TABLE IF NOT EXISTS holidays (
    id               SERIAL PRIMARY KEY,
    date             DATE NOT NULL,
    name             VARCHAR(100) NOT NULL,
    type             VARCHAR(10) NOT NULL CHECK (type IN ('poya', 'public', 'closure')),
    paid             BOOLEAN,            -- null = the type's default
    work_allowed     BOOLEAN,            -- null = the type's default
    applies_to       VARCHAR(10) NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'factory', 'office')),
    collection_stops BOOLEAN NOT NULL DEFAULT FALSE,
    declare_group    UUID,               -- one "Declare holiday" over a range
    reason           TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at     TIMESTAMPTZ,
    cancelled_by     VARCHAR(100),
    cancel_reason    TEXT
);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- Weekly holiday per category; a change adds a row with a later effective_from (past weeks keep theirs).
CREATE TABLE IF NOT EXISTS weekly_holiday_rules (
    id               SERIAL PRIMARY KEY,
    category         VARCHAR(10) NOT NULL CHECK (category IN ('factory', 'office')),
    weekdays         INTEGER[] NOT NULL,   -- 0 = Sunday … 6 = Saturday
    half_day_weekday INTEGER CHECK (half_day_weekday BETWEEN 0 AND 6),
    effective_from   DATE NOT NULL,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO weekly_holiday_rules (category, weekdays, half_day_weekday, effective_from, created_by)
SELECT c, ARRAY[0], NULL, DATE '2000-01-01', 'migration 2026-11-05'
FROM (VALUES ('factory'), ('office')) v(c)
WHERE NOT EXISTS (SELECT 1 FROM weekly_holiday_rules w WHERE w.category = v.c);

-- A per-employee rest day (7-day factories) — overrides the category's weekly holiday.
CREATE TABLE IF NOT EXISTS employee_rest_days (
    id             SERIAL PRIMARY KEY,
    employee_id    INTEGER NOT NULL REFERENCES employees(id),
    weekday        INTEGER CHECK (weekday BETWEEN 0 AND 6),   -- null = back to the category rule
    effective_from DATE NOT NULL,
    created_by     VARCHAR(100),
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employee_rest_days_employee ON employee_rest_days(employee_id);

INSERT INTO system_settings (key, value, updated_by)
VALUES ('attendance', '{"editWindowDays": 3}'::jsonb, 'migration 2026-11-05')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'holidayCalendar', 'view'),
    ('Officer',          'holidayCalendar', 'view'),
    ('Manager',          'holidayCalendar', 'edit'),
    ('ReceivingOfficer', 'holidayCalendar', 'none')
ON CONFLICT (role, module) DO NOTHING;

-- Attendance: `edit` marks today and up to editWindowDays back; `approve` (the Factory Manager)
-- also marks older days, with a reason. The Manager was view-only before.
UPDATE role_permissions SET level = 'approve' WHERE role = 'Manager' AND module = 'attendance' AND level = 'view';

-- Agents are told when a declared holiday cancels their collection day.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'delivery_confirmation', 'otp', 'complaint', 'fertilizer_approval', 'payment_update',
    'collection_complete', 'no_agents', 'cover_request', 'cover_response', 'missed_checkin',
    'route_reassigned', 'exception_request', 'delivery_graded', 'grade_correction',
    'fertilizer_update', 'holiday_declared'));

COMMIT;
