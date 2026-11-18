-- Finance-Reports-Addendum §6–7 — daily expense entries (RPT-04) become real records:
-- an editable category list, paid via cash / bank, a receipt, an edit window and an audit trail.
BEGIN;

-- Categories: editable by the Administrator (ADM-01 Factory Setup); inactive ones stay on old entries.
CREATE TABLE IF NOT EXISTS expense_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(60) NOT NULL UNIQUE,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO expense_categories (name, sort_order, active) VALUES
    ('Firewood / dryer fuel', 1, TRUE),
    ('Electricity',           2, TRUE),
    ('Water',                 3, TRUE),
    ('Vehicle fuel',          4, TRUE),
    ('Vehicle repairs',       5, TRUE),
    ('Machinery maintenance', 6, TRUE),
    ('Packaging',             7, TRUE),
    ('Office & admin',        8, TRUE),
    ('Miscellaneous',         9, TRUE),
    -- the old "Utilities" can't be split into electricity / water after the fact: kept, inactive
    ('Utilities',            99, FALSE)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE expense_entries
    ADD COLUMN IF NOT EXISTS category_id        INTEGER REFERENCES expense_categories(id),
    ADD COLUMN IF NOT EXISTS paid_via           VARCHAR(4) CHECK (paid_via IN ('cash', 'bank')),
    ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_by         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMP,
    ADD COLUMN IF NOT EXISTS edit_reason        TEXT;

-- old fixed categories → the new list
UPDATE expense_entries e SET category_id = c.id
  FROM expense_categories c
 WHERE e.category_id IS NULL
   AND c.name = CASE e.category
                  WHEN 'Maintenance' THEN 'Machinery maintenance'
                  WHEN 'Utilities'   THEN 'Utilities'
                  ELSE 'Miscellaneous'
                END;

ALTER TABLE expense_entries ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE expense_entries DROP COLUMN IF EXISTS category;
CREATE INDEX IF NOT EXISTS idx_expense_entries_category ON expense_entries(category_id);

-- ids from a sequence (was count + 1, which collides); starts after the highest id in use
CREATE SEQUENCE IF NOT EXISTS expense_entry_seq;
SELECT setval('expense_entry_seq',
              GREATEST(coalesce((SELECT max(split_part(id, '-', 3)::int) FROM expense_entries), 0), 1),
              (SELECT count(*) > 0 FROM expense_entries));

-- one receipt per entry, stored in the database until file storage (Cloudinary) lands
CREATE TABLE IF NOT EXISTS expense_receipts (
    entry_id     VARCHAR(20) PRIMARY KEY REFERENCES expense_entries(id) ON DELETE CASCADE,
    file_name    VARCHAR(200) NOT NULL,
    mime_type    VARCHAR(100) NOT NULL,
    size_bytes   INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 2097152),
    data         BYTEA NOT NULL,
    uploaded_by  VARCHAR(100) NOT NULL,
    uploaded_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- `expenses`: edit = log an entry and change your own within the window; approve = change any
-- entry (after the window, with a reason). The Administrator manages categories and only views.
INSERT INTO role_permissions (role, module, level) VALUES
    ('Administrator',    'expenses', 'view'),
    ('Officer',          'expenses', 'edit'),
    ('Manager',          'expenses', 'approve'),
    ('ReceivingOfficer', 'expenses', 'none')
ON CONFLICT (role, module) DO NOTHING;

INSERT INTO system_settings (key, value, updated_by)
VALUES ('expenses', '{"editWindowDays": 7}'::jsonb, 'migration 2026-11-15')
ON CONFLICT (key) DO NOTHING;

COMMIT;
