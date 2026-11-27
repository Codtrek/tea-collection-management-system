import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Users & Roles (docs/specs/Users-Roles-Addendum.md, 2026-11-18).
 *
 * - `users.token_version`: bumped on deactivate / role change / password reset or change; the
 *   portal JWT carries it as `tv` and every request compares it, so revocation is immediate.
 * - `users.email` (optional, unique case-insensitively) for the Add user form.
 * - `users.failed_login_count` + `locked_until`: 5 wrong passwords lock the login for 15 min.
 * - `audit_logs.before / after / reason`: structured before → after for user and permission changes.
 * - Backfills the `role_permissions` rows the baseline never inserted (a migrations-only database
 *   had none for 14 keys, so every server check on them answered `none`). ON CONFLICT DO NOTHING:
 *   a factory's existing choices are never touched.
 *
 * Guarded (IF NOT EXISTS / ON CONFLICT), so re-running on a database that has it is safe.
 */
export class UsersRoles1794400026000 implements MigrationInterface {
  name = 'UsersRoles1794400026000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;

INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator', 'dashboard', 'approve'),   ('Officer', 'dashboard', 'view'),       ('Manager', 'dashboard', 'view'),
    ('Administrator', 'collection', 'approve'),  ('Officer', 'collection', 'edit'),      ('Manager', 'collection', 'view'),
    ('Administrator', 'fertilizer', 'approve'),  ('Officer', 'fertilizer', 'edit'),      ('Manager', 'fertilizer', 'view'),
    ('Administrator', 'estateOwners', 'approve'),('Officer', 'estateOwners', 'edit'),    ('Manager', 'estateOwners', 'view'),
    -- 1794400008000 copied estateAdvances from estateOwners, which had no rows on a migrations-only DB
    ('Administrator', 'estateAdvances', 'approve'),('Officer', 'estateAdvances', 'edit'),('Manager', 'estateAdvances', 'view'),
    ('Administrator', 'payroll', 'approve'),     ('Officer', 'payroll', 'edit'),         ('Manager', 'payroll', 'view'),
    ('Administrator', 'advances', 'approve'),    ('Officer', 'advances', 'approve'),     ('Manager', 'advances', 'view'),
    ('Administrator', 'employees', 'approve'),   ('Officer', 'employees', 'view'),       ('Manager', 'employees', 'view'),
    ('Administrator', 'attendance', 'approve'),  ('Officer', 'attendance', 'edit'),      ('Manager', 'attendance', 'approve'),
    ('Administrator', 'reports', 'approve'),     ('Officer', 'reports', 'edit'),         ('Manager', 'reports', 'view'),
    ('Administrator', 'dispatch', 'approve'),    ('Officer', 'dispatch', 'edit'),        ('Manager', 'dispatch', 'approve'),
    ('Administrator', 'grading', 'view'),        ('Officer', 'grading', 'edit'),         ('Manager', 'grading', 'view'),
    ('Administrator', 'gradingApproval', 'view'),('Officer', 'gradingApproval', 'view'), ('Manager', 'gradingApproval', 'approve'),
    ('Administrator', 'administration', 'approve'),('Officer', 'administration', 'none'),('Manager', 'administration', 'none')
ON CONFLICT (role, module) DO NOTHING;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The backfilled permission rows are left in place: they may have been edited since.
    await queryRunner.query(`
ALTER TABLE audit_logs DROP COLUMN IF EXISTS reason;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS after;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS before;
DROP INDEX IF EXISTS users_email_lower_key;
ALTER TABLE users DROP COLUMN IF EXISTS locked_until;
ALTER TABLE users DROP COLUMN IF EXISTS failed_login_count;
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS token_version;
`);
  }
}
