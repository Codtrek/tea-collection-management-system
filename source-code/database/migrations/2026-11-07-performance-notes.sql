-- Performance-Addendum §5 — the Manager's private notes from conversations with an employee.
-- Readable with performance: view (Manager, Administrator); written with performance: edit. Audited.
BEGIN;

CREATE TABLE IF NOT EXISTS performance_notes (
    id             SERIAL PRIMARY KEY,
    employee_id    INTEGER NOT NULL REFERENCES employees(id),
    note           TEXT NOT NULL,
    author         VARCHAR(100) NOT NULL,
    author_user_id INTEGER REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_performance_notes_employee ON performance_notes(employee_id);

COMMIT;
