-- Performance-Addendum — the performance page reads real records, so access is narrowed.
--   • performance: Manager edit (view the measures + add notes), Administrator approve (pinned),
--     Officer none for now (was view)
BEGIN;

INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'performance', 'approve'),
    ('Manager',          'performance', 'edit'),
    ('Officer',          'performance', 'none'),
    ('ReceivingOfficer', 'performance', 'none')
ON CONFLICT (role, module) DO UPDATE SET level = EXCLUDED.level;

COMMIT;
