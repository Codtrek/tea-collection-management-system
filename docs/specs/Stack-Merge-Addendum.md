# Merging the stack into dev (Addendum)

Status: all four PR branches prepared locally, 2026-11-16. Not pushed. No PR is opened until the
team's two pipelines (schema-drift check on PR creation, migrations against the hosted Azure VM
database) are ready.

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

## PR2–PR4

Each PR branch merges the one before it (never dev), then converts its own migrations and makes its entities exact.

| PR | Conflicts resolved | Migrations | Entity fixes |
|---|---|---|---|
| 2 | attendance / employee entities, Claude.md | `…11000`–`…15000`: attendance & holidays, holiday approvals, holiday import, performance, performance notes | attendance, holidays (types, requests, rules, rest days, import skips), performance notes |
| 3 | package.json scripts (both sets), stock-movement imports, Claude.md | `…16000`: fertilizer write-off | stock_movements: the type CHECK now allows `Write-off` |
| 4 | settlement processing (ours: frozen monthly transport), settlement / expense-entry entities, Claude.md | `…17000`–`…24000`: grade-rates unique, stock unit cost, finance expenses, factory setup, item prices, pay rates, pay adjustments, transport monthly | reports, rates and pay; dev's CHECK on `expense_entries.category` and UNIQUE on item prices dropped, because our migrations replace them |

**PR3 also gives the demo seed the same local-only guard** (URL + server), replacing its hostname-only check.

## Proof at the stack tip (PR4)

- On a fresh local database: Baseline + dev's 4 + our 25 = 30 migrations apply. A second run has nothing pending.
- The schema equals the tip's `init.sql`, apart from dev's additions.
- `migration:generate --dryrun` reports no changes, and the seed completes.
- **Backend:** jest 714 passed (4 opt-in skipped).
- **Portal:** build, 150 unit tests and lint OK.
- **Playwright:** 85 passed, 61 skipped, 5 failed.
  - The 5 failures are in the Collection, Expense and Leaf Purchase reports. They expect Aug–Nov 2026 data from the demo seed, which wasn't loaded; the base seed stops at July.
  - All 90 passed on 15 Nov with demo data.
- **Redis:** login now needs Redis (dev's rate limiting, `REDIS_URL`), and this machine has none. The local e2e runs loaded an in-memory stand-in (`node -r <shim> dist/main`), which is not committed.

## Still to do

- Run all 25 migrations against a restored copy of the hosted database before any of them run there.
- **Local `tea_dev`** was rebuilt on 2026-11-16 from the stack tip (`npm run migration:run` + `npm run seed`). The old copy is in `~/tea-backups/tea_dev-before-rebuild.dump`. The demo seed is not loaded yet.
