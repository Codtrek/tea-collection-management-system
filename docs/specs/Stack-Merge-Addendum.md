# Merging the stack into dev (Addendum)

Status: PR1 prepared locally on `merge/pr1-fertilizer-dispatch`, 2026-11-16. Not pushed. No PR is
opened until the team's two pipelines (schema-drift check on PR creation, migrations against the
hosted Azure VM database) are ready.

## Why

Eight feature branches were stacked on the 18 Oct dev (`68d518a`) and shipped schema as
hand-applied SQL (`source-code/database/migrations/*.sql` + `init.sql`). dev has since moved to
TypeORM migrations (`backend/src/migrations/`, `npm run migration:run`), with entities that mirror
the database exactly (`migration:generate` must come out empty). The stack has to arrive in that
form.

## How it is split

| PR | Branch (local) | Stack branches | Raw SQL migrations |
|---|---|---|---|
| 1 | `merge/pr1-fertilizer-dispatch` | fertilizer delivery, dispatch / fertilizer / payroll fixes | 10 + 1 catch-up |
| 2 | `merge/pr2-attendance-performance` | attendance & leave, performance overview | 5 |
| 3 | `merge/pr3-demo-alerts` | demo seed, fertilizer alerts & card layout | 1 |
| 4 | `merge/pr4-reports-admin` | collection / leaf / expense reports, factory setup & pay rates | 8 |

dev is merged in **once**, into PR1. Each later PR branch merges the one before it, never dev and
never a rebase, so every conflict is resolved once and commit history is kept.

## PR1, commit by commit

1. **Merge `origin/dev`** (`a989faa`). 9 conflicted files, all entities and one spec.
   - **Rule:** keep our columns and shapes, and carry dev's explicit DB metadata on the shared columns.
   - **`fertilizer_charges.stock_movement_id`:** UNIQUE + FK, but nullable (route-stop deliveries have no stock movement).
   - **`factory_employees`:** takes dev's columns (`nic` VARCHAR(20) NOT NULL UNIQUE, which the database already enforced).
2. **Fix to dev's Baseline:** `baseline.sql` re-created `migrations_id_seq`, so Baseline failed on an empty database. It is now `CREATE SEQUENCE IF NOT EXISTS`. A database that already ran Baseline is unaffected.
3. **Ten SQL files as TypeORM classes**, `1794400001000`…`1794400010000`, in commit order.
   - Each is the file's SQL without `BEGIN` / `COMMIT`, with its guards kept.
   - `down` drops what additive migrations created. FertilizerDelivery and EstateAdvancePlans rewrite existing rows and refuse to revert.
   - **Catch-up `1794400010500`:** `salary_advances_installment_months_check` was in `init.sql` but in no SQL file.
4. **Entity ↔ schema parity:** 205 proposed changes down to none. Lengths, timestamptz, defaults, nullable `created_at`, and CHECK / FK / UNIQUE / index names are now declared on every table the stack added or changed.
5. **`users.name`:** NOT NULL in the hosted schema, but nothing filled it.
   - `UsersService.createUser` now takes the name, and the seed sets it.
   - A seed query used `$2` as both text and varchar (`$2::varchar` now). Together, these were why a fresh `npm run seed` failed.
6. **Seed guard** (`backend/src/local-db-guard.ts`): `npm run seed` refuses any database that isn't on this machine.
   - **The URL:** its host must be local, and so must any `host` / `hostaddr` parameter.
   - **The server:** checked after connecting with `inet_server_addr()`, which catches an ssh tunnel forwarding a local port to the hosted DB.

## Proof (fresh local database, `[::1]:5433`; never Neon, never the hosted DB)

- **`npm run migration:run`:** Baseline, dev's 4 and our 11 all apply. A second run has nothing pending.
- **Schema compare:** the migrated schema equals one built from PR1's `init.sql`, apart from dev's own additions (`users.name` / `nic`, estate area / manager, collection requests).
- **Parity:** `migration:generate --dryrun` reports no changes.
- **`npm run seed`** completes.
- **Tests:**
  - Backend: jest 484 tests pass, build OK.
  - Portal: build, 88 unit tests and lint OK. PR1 has no Playwright suite yet.
- **Mobile:** identical to dev. Its 39 type errors exist on dev already.

## Still to do

- PR2–PR4: the same steps for their own migrations.
- The demo seed (PR3) gets the same guard.
- Run all 25 migrations against a restored copy of the hosted database before any of them run there.
- **Local databases built from `init.sql`** (`tea_dev`) have no `migrations` table and lack dev's additions. The simplest fix is to rebuild with `npm run migration:run` + `npm run seed`, since both now work on an empty database.
