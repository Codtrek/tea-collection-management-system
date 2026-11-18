import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-03-estate-advances.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class EstateAdvances1794400008000 implements MigrationInterface {
  name = 'EstateAdvances1794400008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Estate-Owner-Advances-Addendum §1 — a data-driven \`estateAdvances\` permission module for the
-- new Finance → Estate Owner Advances sidebar entry. Each role starts at its current Estate Owner
-- level, so nobody's access changes on day one; ADM-02 can then tune it separately.

INSERT INTO role_permissions (role, module, level)
SELECT role, 'estateAdvances', level
FROM role_permissions
WHERE module = 'estateOwners'
ON CONFLICT (role, module) DO NOTHING;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE module = 'estateAdvances'`,
    );
  }
}
