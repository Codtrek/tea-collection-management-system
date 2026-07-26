# Implementation Plan — Tea Collection Management System

Working roadmap for taking the project from "UI shell with fake data" to a working system.
Branch: `feature/UI-web-portal-extended`. Companion to `Claude.md` (which holds the *design
decisions*); this file holds the *execution order*.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Where we actually are

| Layer | State |
|---|---|
| **Web portal** | All 6 modules UI-complete (~40 screens). **Running entirely on static fixtures.** |
| **Backend** | Stock 5-file NestJS scaffold. No DB, auth, or validation dependencies installed. |
| **Database** | `init.sql` is the *old* schema — does not match the domain model in `Claude.md`. |
| **Infra** | Done. `source-code/docker-compose.yml` = postgres 16 + redis + api + admin + nginx. |
| **Mobile** | Shared shell only (theme tokens, minimal layout). No flows. |

### Two things to know before starting

**1. There is no data seam in the portal yet.** TanStack Query is installed and
`QueryClientProvider` is wired in `src/main.tsx`, but there are **zero `useQuery` calls**.
Every page imports fixtures directly:

```ts
import { EMPLOYEES } from './data'   // static array, rendered synchronously
```

So "connecting the UI" is not a swap — the fetching layer has to be built. Phase 1 builds it
once; every later module reuses it.

**2. The schema blocks authentication.** `users.role` in `init.sql` has a CHECK constraint
listing only 6 roles and **omits `factory_officer` and `factory_manager`** — the exact two roles
the portal's permission model (`source-code/admin/src/context/permissions.ts`) is built around.
An Officer or Manager cannot be logged in until this is fixed. Hence Phase 0 comes first.

---

## Guiding principle: vertical slices, not layers

Do **not** build the whole backend and then connect the whole UI. Take one module at a time all
the way down and back up:

```
   database table  →  NestJS module  →  service in portal  →  screen renders real data
```

Each slice validates the API contract against a real screen, so mistakes are caught in one
module instead of being baked into all six.

---

## Phase 0 — Reconcile the database schema

**Blocking.** Nothing else starts until this lands. Target model is documented in `Claude.md`
(§ Core domain model). File: `source-code/database/init.sql`.

- [ ] Extend `users.role` CHECK to the full 8 roles: `estate_owner`, `estate_manager`,
      `collector`, `receiving_officer`, `factory_admin`, `factory_officer`, `factory_manager`,
      `employee`
- [ ] Add `trucks`, `route_stops`, `pickup_requests`, `advance_payments`, `payment_statements`
- [ ] Drop `tea_selling_requests`, `tea_collection_assignments`, `estate_route_mapping`
      (superseded by the Route/Pickup model)
- [ ] Rename `collection_agents` → `collectors`; add `factory_officers`, `factory_managers`
- [ ] Preserve the documented field-level rules:
      - `routes.status_reason` — required whenever status is `DELAYED` or `CANCELLED`
      - `pickup_requests.gps_pin` — captured offline-capable
      - `pickup_requests.estimated_weight` vs `tea_collection_records.actual_weight` — both stored;
        mismatch beyond threshold auto-generates a `complaint`
      - `tea_collection_records.self_delivered` — skips the transport deduction
      - `tea_collection_records.owner_confirmed` — separate from photo evidence
- [ ] Add tables the web portal needs that the schema has never had:
      - [x] `employee_attendance`, `payroll_runs`, `salary_advances` — done 2026-07-26 with the
        Employees + Payroll slice (2.3), plus a new `employees` table not listed here originally
      - `fertilizer_batches`, `stock_movements`
      - `grade_rates` — **effective-dated**; ADM-01 depends on past settlements never
        recalculating when a rate changes
      - `system_settings`, `audit_logs`

**Done when:** `docker compose up postgres` applies `init.sql` cleanly on an empty volume, and
inserting a `factory_officer` user succeeds (it fails today).

---

## Phase 1 — Backend foundation + Auth slice

The most important phase: it establishes every pattern the other five modules copy.

### Backend (`source-code/backend`)

- [ ] Install: `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`,
      `@nestjs/typeorm`, `typeorm`, `pg`, `bcrypt`, `class-validator`, `class-transformer`
- [ ] `src/users/user.entity.ts`
- [ ] `src/auth/` — `auth.module.ts`, `auth.service.ts`, `auth.controller.ts`, `jwt.strategy.ts`,
      `jwt-auth.guard.ts`, `roles.guard.ts`, `roles.decorator.ts`
- [ ] `POST /auth/login` — phone + password → JWT · `GET /auth/me` — current user
- [ ] Dev seed script: one user per factory role so the portal is testable

> Note: `users` is keyed by **phone**, not email (correct for rural mobile users on the shared
> table). The portal adapts to this — see below.

### Portal seam (`source-code/admin`) — built once, reused by everything

- [ ] **`src/lib/api.ts`** — typed fetch wrapper. Base URL from `import.meta.env.VITE_API_URL`,
      attaches the JWT, throws a typed `ApiError`, routes 401 → logout. Surface failures through
      the existing `useToast`.
- [ ] **`src/services/auth.ts`** — `login()` / `me()`
- [ ] Rewrite **`src/context/AuthContext.tsx`** — real token + user state replacing `MOCK_USERS`.
      **Keep the `can()` and `level()` signatures byte-identical** so no page or guard changes.
- [ ] **`src/features/auth/LoginPage.tsx`** — phone + password form; remove the demo role-switcher
- [ ] `User.email` → `User.phone` in `src/types`
- [ ] Leave `permissions.ts` as a client-side matrix for now — it becomes server-driven in 2.6

**Done when:** `curl -X POST /auth/login` returns a JWT · `/auth/me` returns 401 without it ·
logging into the portal with a real seeded **Officer** account hides Administration in the
sidebar (proving the permission matrix runs off the server-provided role).

---

## Phase 2 — Modules, in dependency order

**Repeat this recipe per module:**

1. Backend module — entity + DTO + service + controller, with **unit tests on the business rules**
   (state transitions, payment math) — these are where the real risk lives
2. `src/services/<module>.ts` in the portal
3. Replace the page's `import { X } from './data'` with `useQuery`
4. Delete the fixture file — **keep `types.ts`**, it already describes the contract

Order is by dependency, not by sidebar order:

- [x] **2.1 Collections (COL-01..04)** — the core domain; exercises the Route/Pickup/Collection
      state machines. Preserve: COL-02 is a *provisional exception entry*, never a weight
      override (only agents enter actual weight); Confirmed records stay locked behind the
      Flag-for-Correction audit path. Done 2026-07-26, `feature/collections-backend`.
- [x] **2.2 Estates + Payments (EST-01..09)** — settlement math needs collection data to exist
      first. Resolve the ~Rs. 3 bank-charge open item here (currently shown as a note, never
      deducted). Done 2026-07-26, `feature/estates-payments-backend` — resolved: never deducted
      from estate owners, factory billed a separate periodic fee instead. Settlement processing
      is done; auto-generation from live data is deferred to when 2.4/2.6 land (see Claude.md).
- [x] **2.3 Employees (EMP-01..14)** — largest surface, fully greenfield backend
      (attendance, payroll, advances). Done 2026-07-26, `feature/employees-payroll-backend` — new
      `employees` table (separate from `factory_employees`); payroll is live-computed
      (attendance × pay rates via a "Generate" step, snapshotted for immutability), not seeded;
      roster writes are Administrator-only (stricter than Estates' Officer-can-edit).
- [ ] **2.4 Fertilizer (FERT-01..04)** — feeds the estate settlement deduction breakdown.
- [ ] **2.5 Reports (RPT-01..04)** — pure aggregation; needs the others populated to be
      meaningful. Must aggregate **Confirmed records only**.
- [ ] **2.6 Administration (ADM-01..04)** — last, because it makes previously-static things
      server-driven: versioned grade rates and the ADM-02 editable permission matrix (which is
      what the data-driven `permissions.ts` model was designed for).

---

## Phase 3 — Mobile

- [ ] Role-based login against the Phase 1 auth API + per-role dashboards
- [ ] Route flows (collector "Start Route"), Pickup request flows, weight entry with
      on-device owner confirmation + photo evidence
- [ ] Offline-first SQLite queue (`QUEUED_OFFLINE` → real status on sync) per `Claude.md`
- [ ] "No connection — call your collector directly" fallback screen with cached phone numbers

---

## Carried-forward items

Fold these into whichever phase touches the relevant code.

**Deferred a11y polish** (from the 2026-07-18 UI review):
- [ ] `Modal` has no real focus trap — Tab escapes to background; no focus restore on close
- [ ] `DataTable` rows with `onRowClick` are mouse-only (no `tabIndex` / Enter / Space)
- [ ] `Tabs` missing roving tabindex, arrow-key nav, and `aria-controls` → `role="tabpanel"` wiring
- [ ] `Toggle` hit area is 20×36px, under the 44px minimum

**Open business questions** — decide before the module that needs them ships:
- [x] Who absorbs the ~Rs. 3 per-transaction bank charge — resolved 2026-07-26: nobody, it's
      never deducted from estate owners/employees; the factory is billed a separate periodic fee.
- [ ] Ad-hoc vs request-linked fertilizer dispatch (blocks 2.4)
- [ ] Beneficiary-items scope

---

## Standing rules

- `npm run build` and `npm run lint` stay clean in **both** apps at every phase
- Update the implementation-status section of `Claude.md` as each phase lands
- Domain rules listed in `Claude.md` and `source-code/admin/AGENTS.md` are non-negotiable —
  don't regress them while wiring the backend
