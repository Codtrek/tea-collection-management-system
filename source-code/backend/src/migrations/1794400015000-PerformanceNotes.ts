import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converted from source-code/database/migrations/2026-11-07-performance-notes.sql (hand-applied before dev
 * moved to TypeORM migrations). Same SQL without BEGIN/COMMIT — TypeORM wraps each
 * migration in a transaction. Guarded (IF NOT EXISTS / ON CONFLICT), so a database that
 * already ran the raw file is safe.
 */
export class PerformanceNotes1794400015000 implements MigrationInterface {
  name = 'PerformanceNotes1794400015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Performance-Addendum §5 — the Manager's private notes from conversations with an employee.
-- Readable with performance: view (Manager, Administrator); written with performance: edit. Audited.

CREATE TABLE IF NOT EXISTS performance_notes (
    id             SERIAL PRIMARY KEY,
    employee_id    INTEGER NOT NULL REFERENCES employees(id),
    note           TEXT NOT NULL,
    author         VARCHAR(100) NOT NULL,
    author_user_id INTEGER REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_performance_notes_employee ON performance_notes(employee_id);
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS performance_notes`);
  }
}
