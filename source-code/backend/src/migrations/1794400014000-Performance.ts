import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-07-performance.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class Performance1794400014000 implements MigrationInterface {
  name = 'Performance1794400014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Performance-Addendum — the performance page reads real records, so access is narrowed.
--   • performance: Manager edit (view the measures + add notes), Administrator approve (pinned),
--     Officer none for now (was view)

INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'performance', 'approve'),
    ('Manager',          'performance', 'edit'),
    ('Officer',          'performance', 'none'),
    ('ReceivingOfficer', 'performance', 'none')
ON CONFLICT (role, module) DO UPDATE SET level = EXCLUDED.level;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE module = 'performance'`,
    );
  }
}
