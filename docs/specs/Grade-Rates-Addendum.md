# Grade rates: versions by effective date (ADM-01 Addendum)

Status: implemented on `feat/collection-report` · 2026-11-15

## Why this addendum

Leaf is worth what the grade rates say on the day it was delivered. A rate change must never
alter the value of leaf already delivered. ADM-01 already kept versions, but three gaps broke
that rule. This addendum closes them, and makes the rates the source of the Leaf Purchase Report
(Reports addendum §9).

## 1. Storage (already in place)

`grade_rates` keeps one row per version: `id` (`GR-YYYY-NNNN`), `super_rate`, `normal_rate`,
`effective_date`, `set_by`, `created_at`. Rows are only ever inserted, never updated or deleted.

Versions on the local DB:

| Effective from | Super | Normal |
|---|---|---|
| 2026-01-01 | 172 | 88 |
| 2026-04-01 | 180 | 92 |
| 2026-07-01 | 185 | 95 |

## 2. The rules

- **Rate in force on a date:** the newest version whose effective date is on or before that date
  (`rateVersionFor`, `backend/src/estates/settlement-calc.ts`). It is the one lookup, used by:
  - Factory Setup's "Current" badge
  - the Leaf Purchase Report
  - the settlement generator, when one is built
- **Current** is the version in force **today** (Colombo calendar). A version dated later is
  **Scheduled**. It used to show as "Current" before it took effect.
- **No back-dating.** A new version must start **today or later**. A past start would reprice leaf
  already delivered, so the API refuses it (400) and the form blocks it (`min` = today, inline error).
- **One version per date.** `UNIQUE (effective_date)` (migration `2026-11-15-grade-rates-unique.sql`,
  mirrored in `init.sql`). A clash returns 409; versions are never edited.
- **Deliveries before the first version** have no rate in force. Reports show them as "No rate" and
  never give them a guessed value. The local DB has 13 such deliveries, dated 2019–2025. If those
  years matter, an Administrator adds a version for them; that is the only way past values change,
  and it is visible in the audit log.

## 3. Who reads the rates

- **Factory Setup (ADM-01):** the history table, Current and Scheduled.
- **Leaf Purchase Report (RPT-02):** values every graded delivery at the rate in force on its date.
- **Settlements:** they still keep the snapshot rates written when they were created; they are
  seeded today and no generator exists. When a generator is built, it must take its rates from
  `rateVersionFor` on each delivery's date, so that settlements and the Leaf Purchase Report agree.

## 4. When the branch stack merges into dev

`dev` now uses TypeORM migrations (`src/migrations/*.ts`). The unique constraint above must become a
migration class there, using the same idempotent SQL.
